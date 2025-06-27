import { ConnectedSocket, MessageBody, OnGatewayConnection, SubscribeMessage, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import { Server, Socket } from 'socket.io';
import { ChatService } from "./services/chat.service";
import { MessageDto } from "./dtos/message.dto";
import { GetChatMessagesDto } from "./dtos/get-all-messages.dto";

@WebSocketGateway()
export class ChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server;

    constructor(private chatService: ChatService) {}

    async handleConnection(socket: Socket) {
        await this.chatService.getUserFromSocket(socket); 
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