import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthService } from 'src/auth/services/auth.service';
import { PrismaService } from 'src/prisma.service';
import { Socket } from 'socket.io';
import { ChatMemberRole, ChatType, User } from '@prisma/client';
import { WsException } from '@nestjs/websockets';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { CreateChatDto } from '../dtos/create-new-chat.dto';

@Injectable()
export class ChatService {
    constructor(private authService: AuthService, private prisma: PrismaService) {}

    async getUserFromSocket(socket: Socket): Promise<User> {
        const authHeader = socket.handshake.headers.authorization;
        if (!authHeader) {
            throw new WsException('Authorization header missing');
        }

        const tokenParts = authHeader.split(' ');
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            throw new WsException('Invalid authorization header format');
        }
        const authToken = tokenParts[1];

        try {
            const user = await this.authService.getUserFromAuthenticationToken(authToken);
            if (!user) {
                throw new WsException('Invalid credentials or user not found');
            }
            return user;
        } catch (error) {
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException('Invalid credentials');
        }
    }

    async isUserChatMember(userId: string, chatId: string): Promise<boolean> {
        const member = await this.prisma.chatMember.findUnique({
            where: {
                userId_chatId: {
                    userId, chatId
                },
            },
        });
        return !!member;
    }

    async createChat(createChatDto: CreateChatDto, creatorId: string) {
        const { name, participantIds, isGroupChat = false, description } = createChatDto;
        const chatType = isGroupChat ? ChatType.GROUP : ChatType.PRIVATE;

        if (!participantIds.includes(creatorId)) {
            participantIds.push(creatorId);
        }

        const usersExistCount = await this.prisma.user.count({
            where: { id: { in: participantIds },}
        });
        if (usersExistCount !== participantIds.length) {
            throw new NotFoundException('One or more participant users not found.');
        };
        
        if (chatType === ChatType.PRIVATE && participantIds.length !== 2) {
            const user1Id = participantIds[0];
            const user2Id = participantIds[1];

            const existingChat = await this.prisma.chat.findFirst({
                where: {
                    type: ChatType.PRIVATE,
                    members: {
                        every: { userId: { in: [user1Id, user2Id] } }
                    },
                },
            });
            
            if (existingChat) {
                const memberCount = await this.prisma.chatMember.count({
                    where: { chatId: existingChat.id }
                });
                if (memberCount === 2) return existingChat;
            }

            const newChat = await this.prisma.chat.create({
                data: {
                    name: isGroupChat ? name : null,
                    description,
                    type: chatType,
                    isGroupChat,
                    creatorId: creatorId,
                    members: {
                        create: participantIds.map(pId => ({
                            userId: pId,
                            role: pId === creatorId ? ChatMemberRole.ADMIN : ChatMemberRole.MEMBER,
                        })),
                    },
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: { id: true, displayName: true, avatarUrl: true }
                            }
                        }
                    }
                }
            });
            return newChat;
        }
    }

    async createMessage(createMessageDto: CreateMessageDto, senderId: string) {
        const { content, chatId } = createMessageDto;

        const chat = await this.prisma.chat.findUnique({
            where: {
                id: chatId,
            },
        });
        if (!chat) {
            throw new WsException(`Chat with ID ${chatId} not found`);
        }

        const isMember = await this.isUserChatMember(senderId, chatId);
        if (!isMember) {
            throw new WsException(`User is not a member of chat ${chatId}`);
        }

        try {
            const [newMessage] = await this.prisma.$transaction([
                this.prisma.message.create({
                    data: {
                        content,
                        chatId,
                        senderId,
                    },
                    include: {
                        sender: {
                            select: { id: true, displayName: true, avatarUrl: true},
                        },
                    },
                }),
                this.prisma.chat.update({
                    where: { id: chatId },
                    data: { updatedAt: new Date() },
                }),
            ]);
            return newMessage;
        } catch (error) {
            throw new WsException('Could not create message.');
        }
    }

    async getMessagesForChat(chatId: string, userId: string) {
        const isMember = await this.isUserChatMember(userId, chatId);
        if(!isMember) {
            throw new ForbiddenException(`Access denied. User is not a member of chat ${chatId}`);
        }

        try {
            return await this.prisma.message.findMany({
                where: { chatId: chatId },
                include: {
                    sender: {
                        select: { id: true, displayName: true, avatarUrl: true },
                    },
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });
        } catch (error) {
            throw new WsException(`Could not retrieve messages for chat ${chatId}.`);
        }
    }

    async getUserChats(userId: string) {
        try {
            return await this.prisma.chat.findMany({
                where: {
                    members: {
                        some: { userId: userId },
                    },
                },
                include: {
                    members: {
                        include: {
                            user: {
                                select: { id: true, displayName: true, avatarUrl: true },
                            },
                        },
                    },
                    messages: {
                        orderBy: { timestamp: 'desc' },
                        take: 1,
                        select: {
                            content: true,
                            timestamp: true,
                            sender: { select: { id:true, displayName: true } },
                        },
                    },
                    creator: {
                         select: { id: true, displayName: true, avatarUrl: true }
                    }
                },
                orderBy: {
                    updatedAt: 'desc',
                },
            });
        } catch (error) {
            throw new WsException("Could not retrieve user's chats.");
        }
    }

    async updateLastReadTimestamp(userId: string, chatId: string, messageId?: string) {
        const isMember = await this.isUserChatMember(userId, chatId);
        if (!isMember) {
            throw new WsException("User is not a member of this chat.");
        }

        let timestampToUpdate: Date;
        if (messageId) {
            const message = await this.prisma.message.findUnique({ where: { id: messageId }});
            if (!message || message.chatId !== chatId) {
                throw new WsException("Message not found or does not belong to this chat.");
            }
            timestampToUpdate = message.timestamp;
        } else {
            timestampToUpdate = new Date();
        }

        return this.prisma.chatMember.update({
            where: { userId_chatId: { userId, chatId } },
            data: { lastReadMessageTimestamp: timestampToUpdate },
        });
    }
}
