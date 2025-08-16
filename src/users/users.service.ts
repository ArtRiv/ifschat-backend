import { Injectable } from '@nestjs/common';
import { User, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma.service';
import { UserDataDTO } from './dtos/user-data.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  async user(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<UserDataDTO | null> {
    const result = await this.prisma.user.findUnique({
      where: userWhereUniqueInput,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        chatMemberships: {
          select: { chatId: true },
        },
      }
    });

    if (!result) return null;

    return {
      id: result.id,
      username: result.username,
      avatarUrl: result.avatarUrl ?? null,
      chatMemberships: result.chatMemberships.map(m => m.chatId),
    };
  }

  async findUserAuth(
    userWhereUniqueInput: Prisma.UserWhereUniqueInput,
  ): Promise<Pick<User, 'id' | 'username' | 'passwordHash'> | null> {
    return this.prisma.user.findUnique({
      where: userWhereUniqueInput,
      select: {
        id: true,
        username: true,
        passwordHash: true,
      },
    });
  }

  async users(params: {
    skip?: number
    take?: number
    cursor?: Prisma.UserWhereUniqueInput
    where?: Prisma.UserWhereInput
    orderBy?: Prisma.UserOrderByWithRelationInput
  }): Promise<UserDataDTO[]> {
    const { skip, take, cursor, where, orderBy } = params
    const results = await this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        chatMemberships: {
          select: { chatId: true },
        },
      }
    })
        const teste = await this.prisma.user.findMany();
    console.log(teste)
    return results.map(u => ({
      id: u.id,
      username: u.username,
      avatarUrl: u.avatarUrl ?? null,
      chatMemberships: u.chatMemberships.map(m => m.chatId),
    }))
  }

  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    })
  };

  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      where,
      data,
    });
  }

  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    })
  }
}