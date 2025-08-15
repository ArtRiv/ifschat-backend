import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
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
import { JwtService } from '@nestjs/jwt'
import { jwtConstants } from 'src/auth/constants/constants'

type Presence = 'online' | 'offline'

@Injectable()
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: ['http://localhost:5173'],
    credentials: true,
    methods: ['GET','POST'],
    allowedHeaders: ['Authorization','Content-Type'],
  },
})
@UseGuards(WsJwtGuard)
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server

  private readonly logger = new Logger(ChatGateway.name)
  private userSockets = new Map<string, Set<string>>()

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('ChatGateway initialized; registering auth middleware')

    server.use((socket, next) => {
      try {
        const token =
          this.extractTokenFromHeader(socket) ||
          (typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : undefined) ||
          (typeof socket.handshake.query?.token === 'string' ? (socket.handshake.query.token as string) : undefined)

        if (!token) {
          this.logger.warn('Handshake blocked: missing token')
          return next(new Error('Unauthorized: missing token'))
        }

        const payload = this.jwtService.verify(token, { secret: jwtConstants.secret })
        socket.data.user = payload
        this.logger.debug(`Handshake authorized for user ${payload?.sub ?? 'unknown'}`)
        return next()
      } catch (e) {
        this.logger.warn(`Handshake blocked: invalid token (${(e as Error).message})`)
        return next(new Error('Unauthorized: invalid token'))
      }
    })
  }

  async handleConnection(client: Socket) {
    const user = client.data?.user as { sub: string; username?: string } | undefined
    if (!user?.sub) {
      client.disconnect(true)
      return
    }

    this.addUserSocket(user.sub, client.id)
    this.broadcastPresence(user.sub, 'online')

    try {
      const chatIds = await this.chatService.getUserChatIds(user.sub)
      chatIds.forEach((id) => client.join(this.chatRoom(id)))
    } catch (e) {
      this.logger.warn(`Failed to auto-join rooms for user ${user.sub}: ${String(e)}`)
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data?.user as { sub: string } | undefined
    if (!user?.sub) return
    this.removeUserSocket(user.sub, client.id)
    if (!this.userSockets.get(user.sub)?.size) {
      this.broadcastPresence(user.sub, 'offline')
    }
  }

  @SubscribeMessage('joinChat')
  async onJoinChat(@ConnectedSocket() client: Socket, @MessageBody() payload: { chatId: string }) {
    if (!payload?.chatId) throw new WsException('chatId is required')
    client.join(this.chatRoom(payload.chatId))
    client.emit('joinedChat', { chatId: payload.chatId })
  }

  @SubscribeMessage('typing')
  async onTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: { chatId: string; isTyping: boolean }) {
    const user = client.data.user as { sub: string }
    if (!payload?.chatId) throw new WsException('chatId is required')
    client.to(this.chatRoom(payload.chatId)).emit('typing', {
      chatId: payload.chatId,
      userId: user.sub,
      isTyping: !!payload.isTyping,
    })
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessageDto) {
    const user = client.data.user as { sub: string }
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

  private extractTokenFromHeader(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization as string | undefined
    if (!authHeader) return undefined
    const [type, token] = authHeader.split(' ')
    return type === 'Bearer' ? token : undefined
  }
}