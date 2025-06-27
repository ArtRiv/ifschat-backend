import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ChatService } from '../services/chat.service';
import { AuthGuard } from 'src/auth/guards/auth.guard';
import { CreateMessageDto } from '../dtos/create-message.dto';
import RequestWithUser from '../interfaces/request-with-user.interface';
import { GetChatMessagesDto } from '../dtos/get-all-messages.dto';

@Controller('chat')
export class ChatController {
    constructor(private chatService: ChatService) {}

    @UseGuards(AuthGuard)
    @Post()
    async createMessage(@Body() createMessageDto: CreateMessageDto, @Req() req: RequestWithUser) {
        const userId = req.user['sub'];
        return this.chatService.createMessage(createMessageDto, userId);
    }

    @UseGuards(AuthGuard)
    @Get(':chatId')
    async getAllMessages(@Param('chatId') getAllMessages: GetChatMessagesDto, @Req() req: RequestWithUser) {
        const userId = req.user['sub'];
        return this.chatService.getMessagesForChat(getAllMessages.chatId, userId);
    }
}   
