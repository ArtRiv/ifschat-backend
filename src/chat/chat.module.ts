import { Module } from '@nestjs/common'
import { ChatController } from './controllers/chat.controller'
import { ChatService } from './services/chat.service'
import { ChatGateway } from './gateways/chat.gateway'
import { JwtModule } from '@nestjs/jwt'
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard'
import { PrismaService } from 'src/prisma.service'

@Module({
  imports: [
    JwtModule.register({})
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, PrismaService, WsJwtGuard],
  exports: [ChatService],
})
export class ChatModule {}