import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { ChatService } from "./services/chat.service";
import { MessageDto } from "./dtos/message.dto";
import { GetChatMessagesDto } from "./dtos/get-all-messages.dto";
import { UsersService } from "src/users/users.service";

@WebSocketGateway({
    cors: {
        origin: ['http://191.36.13.149:5173'],
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
})
export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    private onlineUsers: Set<string> = new Set();

    constructor(
        private chatService: ChatService,
        private usersService: UsersService
    ) { }

    async handleConnection(socket: Socket) {
        const user = await this.chatService.getUserFromSocket(socket);
        if (user) {
            this.onlineUsers.add(user.id);
            await this.broadcastOnlineUsers();
        }
    }

    async handleDisconnect(socket: Socket) {
        const user = await this.chatService.getUserFromSocket(socket);
        if (user) {
            this.onlineUsers.delete(user.id);
            await this.broadcastOnlineUsers();
        }
    }

    private async broadcastOnlineUsers() {
        const users = await this.usersService.users({});
        const usersWithOnlineStatus = users.map(user => ({
            ...user,
            isOnline: this.onlineUsers.has(user.id)
        }));
        this.server.sockets.emit('online_users', usersWithOnlineStatus);
    }

    @SubscribeMessage('send_message')
    async listenForMessages(@MessageBody() message: MessageDto, @ConnectedSocket() socket: Socket) {
        const user = await this.chatService.getUserFromSocket(socket);
        const newMessage = await this.chatService.createMessage(message, user.id);

        this.server.sockets.emit('receive_message', newMessage);

        return newMessage;
    }

    @SubscribeMessage('get_all_messages')
    async getAllMessages(@MessageBody() getAllMessages: GetChatMessagesDto, @ConnectedSocket() socket: Socket) {

        const user = await this.chatService.getUserFromSocket(socket);
        const messages = await this.chatService.getMessagesForChat(getAllMessages.chatId, user.id);

        this.server.sockets.emit('all_messages', messages);

        return messages;
    }
}