import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common'
import { Public } from '../decorators/set-metadata.decorator'
import { AuthService } from '../services/auth.service'
import { SignInDto } from '../dtos/sign-in.dto'
import { JwtResponseDto } from '../dtos/jwt-response.dto'
import { SignUpDto } from '../dtos/sign-up.dto'

@Controller('auth')
export class AuthController {
  constructor (private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('signin')
  signIn (@Body() signInDto: SignInDto): Promise<JwtResponseDto> {
    return this.authService.signIn(signInDto)
  }

  @Public()
  @HttpCode(HttpStatus.CREATED)
  @Post('signup')
  signUp (@Body() signUpDto: SignUpDto): Promise<JwtResponseDto> {
    return this.authService.signUp(signUpDto)
  }

  @Public()
  @Get('get_all_users')
  getAllUsers(): Promise<any> {
    return this.authService.getAllUsers();
  }

  // Example on how to use the AuthGuard to protect a route
  //   @UseGuards(AuthGuard)
  //   @Get('profile')
  //   getProfile(@Request() req): any {
  //     return req.user; // Returns the user object from the JWT payload
  //   }
}
