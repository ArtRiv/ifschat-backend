import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common'
import { Request } from 'express'
import { UsersService } from '../users.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { UserDataDTO } from '../dtos/user-data.dto'

@Controller('user')
export class UserController {
  constructor(private userService: UsersService) {}

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('get_data')
  get_data(@Req() req: Request): Promise<UserDataDTO | null> {
    const user = (req as any).user as { username: string }
    return this.userService.user({ username: user.username })
  }

  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('get_users_list')
  get_users_list(@Req() req: Request): Promise<UserDataDTO[]> {
    const user = (req as any).user as { sub: string, username: string }
    console.log(user);
    return this.userService.users({
      where: {
        isActive: true,
        id: { not: user.sub },
      },
      orderBy: { username: 'asc' },
    })
  }
}