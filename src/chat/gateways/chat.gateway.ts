import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { UseGuards, Injectable, Logger } from '@nestjs/common'
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard'
import { ChatService } from '../services/chat.service'
import { SendMessageDto } from '../dtos/send-message.dto'

type Presence = 'online' | 'offline'

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: '*', credentials: true },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(ChatGateway.name)

  // Track user -> socket ids (to handle multiple tabs)
  private userSockets = new Map<string, Set<string>>()

  constructor(private readonly chatService: ChatService) {}

  async handleConnection(client: Socket) {
    const user = (client.data as any).user as { sub: string; username?: string }
    if (!user?.sub) {
      client.disconnect(true)
      return
    }

    this.addUserSocket(user.sub, client.id)
    this.broadcastPresence(user.sub, 'online')

    // Optionally auto-join chat rooms the user belongs to
    try {
      const chatIds = await this.chatService.getUserChatIds(user.sub)
      chatIds.forEach((id) => client.join(this.chatRoom(id)))
    } catch (e) {
      this.logger.warn(`Failed to auto-join rooms for user ${user.sub}: ${String(e)}`)
    }
  }

  async handleDisconnect(client: Socket) {
    const user = (client.data as any).user as { sub: string } | undefined
    if (!user?.sub) return
    this.removeUserSocket(user.sub, client.id)
    if (!this.userSockets.get(user.sub)?.size) {
      this.broadcastPresence(user.sub, 'offline')
    }
  }

  @SubscribeMessage('joinChat')
  async onJoinChat(@ConnectedSocket() client: Socket, @MessageBody() payload: { chatId: string }) {
    const user = (client.data as any).user as { sub: string }
    if (!payload?.chatId) throw new WsException('chatId is required')
    // Optional: verify membership before joining
    client.join(this.chatRoom(payload.chatId))
    client.emit('joinedChat', { chatId: payload.chatId })
  }

  @SubscribeMessage('typing')
  async onTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: { chatId: string; isTyping: boolean }) {
    const user = (client.data as any).user as { sub: string; username?: string }
    if (!payload?.chatId) throw new WsException('chatId is required')
    client.to(this.chatRoom(payload.chatId)).emit('typing', {
      chatId: payload.chatId,
      userId: user.sub,
      isTyping: !!payload.isTyping,
    })
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessageDto) {
    const user = (client.data as any).user as { sub: string }
    if (!payload?.chatId || !payload?.content) {
      throw new WsException('chatId and content are required')
    }

    const message = await this.chatService.createMessage(payload.chatId, user.sub, payload.content)
    this.server.to(this.chatRoom(payload.chatId)).emit('message', message)
    client.emit('messageSent', { id: message.id, chatId: message.chatId })
  }

  private chatRoom(chatId: string) {
    return `chat:${chatId}`
  }

  private addUserSocket(userId: string, socketId: string) {
    const set = this.userSockets.get(userId) ?? new Set<string>()
    set.add(socketId)
    this.userSockets.set(userId, set)
  }

  private removeUserSocket(userId: string, socketId: string) {
    const set = this.userSockets.get(userId)
    if (!set) return
    set.delete(socketId)
    if (!set.size) this.userSockets.delete(userId)
  }

  private broadcastPresence(userId: string, status: Presence) {
    this.server.emit('presence', { userId, status })
  }
}   