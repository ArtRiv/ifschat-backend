import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { CreateChatDTO } from '../dtos/create-chat.dto'
import { ChatType, ChatMemberRole } from '@prisma/client'
import { PrismaService } from 'src/prisma.service'

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Creates a chat (PRIVATE or GROUP).
   * - Ensures creator is included among members (as ADMIN).
   * - PRIVATE chat: if one already exists between the two users, returns the existing chat id.
   * - GROUP chat: requires a name; creates a new chat with participants.
   * Returns the chat id.
   */
  async createChat(dto: CreateChatDTO, creatorId: string): Promise<string> {
    if (!dto?.membersIds?.length) {
      throw new BadRequestException('membersIds must contain at least one user id')
    }

    // Ensure the creator is included
    const uniqueMemberIds = Array.from(new Set([creatorId, ...dto.membersIds]))

    // Validate users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueMemberIds } },
      select: { id: true },
    })
    if (users.length !== uniqueMemberIds.length) {
      throw new NotFoundException('One or more users do not exist')
    }

    // Determine chat type if not provided
    let type: ChatType = dto.type ??
      (uniqueMemberIds.length > 2 ? ChatType.GROUP : ChatType.PRIVATE)

    if (type === ChatType.PRIVATE) {
      // For PRIVATE, it must be exactly two participants: creator and one other
      if (uniqueMemberIds.length !== 2) {
        throw new BadRequestException('Private chats must have exactly two participants')
      }
      const otherUserId = uniqueMemberIds.find(id => id !== creatorId)!
      // Check if a private chat already exists between these two users
      const existing = await this.prisma.chat.findFirst({
        where: {
          type: ChatType.PRIVATE,
          AND: [
            { members: { some: { userId: creatorId } } },
            { members: { some: { userId: otherUserId } } },
          ],
        },
        select: { id: true },
      })
      if (existing) {
        return existing.id
      }
    } else {
      // GROUP chat: require a name
      if (!dto.name || !dto.name.trim()) {
        throw new BadRequestException('Group chats require a name')
      }
    }

    const created = await this.prisma.chat.create({
      data: {
        type,
        name: dto.name ?? null,
        description: dto.description ?? null,
        creatorId,
        members: {
          create: uniqueMemberIds.map((userId) => ({
            userId,
            role: userId === creatorId ? ChatMemberRole.ADMIN : ChatMemberRole.MEMBER,
          })),
        },
      },
      select: { id: true },
    })

    return created.id
  }

  /**
   * Creates a message in a chat from a sender.
   * Returns the message with minimal details for broadcasting.
   */
  async createMessage(chatId: string, senderId: string, content: string) {
    if (!content || !content.trim()) {
      throw new BadRequestException('Message content cannot be empty')
    }

    // Verify membership
    const membership = await this.prisma.chatMember.findUnique({
      where: { userId_chatId: { userId: senderId, chatId } },
      select: { userId: true },
    })
    if (!membership) {
      throw new BadRequestException('You are not a member of this chat')
    }

    const msg = await this.prisma.message.create({
      data: {
        chatId,
        senderId,
        content: content.trim(),
      },
      include: {
        sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    })

    return {
      id: msg.id,
      chatId: msg.chatId,
      content: msg.content,
      timestamp: msg.timestamp,
      sender: msg.sender,
    }
  }

  /**
   * Optional helper: get chats for a user (for joining rooms on connect)
   */
  async getUserChatIds(userId: string): Promise<string[]> {
    const memberships = await this.prisma.chatMember.findMany({
      where: { userId },
      select: { chatId: true },
    })
    return memberships.map(m => m.chatId)
  }
}