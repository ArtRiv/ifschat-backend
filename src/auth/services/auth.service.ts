import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import { UsersService } from 'src/users/users.service'

import * as bcrypt from 'bcrypt'
import { JwtResponseDto } from '../dtos/jwt-response.dto'
import { JwtService } from '@nestjs/jwt'
import { SignInDto } from '../dtos/sign-in.dto'
import { SignUpDto } from '../dtos/sign-up.dto'
import { getRandomAvatar } from '../utils/get-random-avatar'

@Injectable()
export class AuthService {
  constructor (
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async signIn ({ username, password }: SignInDto): Promise<JwtResponseDto> {
    if (!username || !password) {
      throw new BadRequestException('Username and password are required')
    }

    const user = await this.usersService.findUserAuth({ username })

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    this.usersService.updateUser({
      where: {
        id: user.id
      },
      data: {
        ...user,
        isActive: true,
      }
    })

    const payload = { sub: user.id, username: user.username }
    return {
      access_token: await this.jwtService.signAsync(payload),
    }
  }

  async signUp ({ username, password }: SignUpDto): Promise<JwtResponseDto> {
    if (!username || !password) {
      throw new BadRequestException('Username and password are required')
    }

    const existingUser = await this.usersService.user({ username })
    if (existingUser) {
      throw new BadRequestException('Username already exists')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    let newUser
    try {
      newUser = await this.usersService.createUser({
        username,
        displayName: username,
        passwordHash,
      })
    } catch (error) {
      console.error('Error during initial user creation', error)
      throw new InternalServerErrorException(
        'An error occurred during user registration',
      )
    }

    if (!newUser || newUser.id === undefined) {
      throw new InternalServerErrorException(
        'User registration failed or ID was not assigned',
      )
    }

    const avatarUrl = getRandomAvatar(newUser.id)

    let updatedUser
    try {
      updatedUser = await this.usersService.updateUser({
        where: { id: newUser.id },
        data: { avatarUrl },
      })
    } catch (error) {
      console.error('Error during avatar URL update', error)
      throw new InternalServerErrorException(
        'Failed to assign avatar to the new user.',
      )
    }

    if (!updatedUser) {
      throw new InternalServerErrorException(
        'Failed to finalize user avatar assignment',
      )
    }

    const payload = { sub: updatedUser.id, username: updatedUser.username }
    return {
      access_token: await this.jwtService.signAsync(payload),
    }
  }

  async signOut (id: string) {
    if (!id) return;

    const existingUser = await this.usersService.user({ id })
    if (!existingUser) {
      throw new BadRequestException('Username doenst exist')
    }

    const disconnectedUser = await this.usersService.updateUser({
        where: { id: id },
        data: { 
          ...existingUser,
          isActive: false,
        },
      })
  }

  async getAllUsers (): Promise<any> {
    return this.usersService.users({});
  }
}