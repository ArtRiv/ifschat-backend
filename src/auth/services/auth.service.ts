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
import JwtPayload from '../interfaces/jwt-payload.interface'
import { jwtConstants } from '../constants/constants'

@Injectable()
export class AuthService {
  constructor (
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}
  /**
   * Sign in a user with username and password.
   * @param username - The username of the user.
   * @param pass - The password of the user.
   * @returns A promise that resolves to the user object if credentials are valid.
   * @throws BadRequestException if username or password is missing.
   * @throws UnauthorizedException if credentials are invalid.
   */
  async signIn ({ username, password }: SignInDto): Promise<JwtResponseDto> {
    if (!username || !password) {
      throw new BadRequestException('Username and password are required')
    }

    const user = await this.usersService.user({ username: username })

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const payload = { sub: user.id, username: user.username }
    return {
      access_token: await this.jwtService.signAsync(payload),
    }
  }

  async signUp ({ username, password }: SignUpDto): Promise<JwtResponseDto> {
    if (!username || !password) {
      throw new BadRequestException('Username and password are required')
    }

    const existingUser = await this.usersService.user({ username: username })

    if (existingUser) {
      throw new BadRequestException('Username already exists')
    }

    const passwordHash = await bcrypt.hash(password, 10)

    let newUser
    try {
      newUser = await this.usersService.createUser({
        username: username,
        displayName: username,
        passwordHash: passwordHash,
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
        data: { avatarUrl: avatarUrl },
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

  public async getUserFromAuthenticationToken(token: string) {
    const payload: JwtPayload = this.jwtService.verify(token, {
      secret: jwtConstants.secret,
    });

    const userId = payload.sub;

    if (userId) {
      return this.usersService.user({
        id: userId,
      });
    }
  }
}
