import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ChatService } from '../services/chat.service'
import { CreateChatDTO } from '../dtos/create-chat.dto'
import { Request } from 'express'

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @Post('create')
  createChat(@Req() req: Request, @Body() dto: CreateChatDTO): Promise<string> {
    const user = (req as any).user as { sub: string }
    return this.chatService.createChat(dto, user.sub)
  }
}