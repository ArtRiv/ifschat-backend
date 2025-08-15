import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { jwtConstants } from '../constants/constants'
import { Socket } from 'socket.io'

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>()

    const token =
      this.extractTokenFromHeader(client) ||
      (typeof client.handshake.auth?.token === 'string' ? client.handshake.auth.token : undefined) ||
      (typeof client.handshake.query?.token === 'string' ? (client.handshake.query.token as string) : undefined)

    if (!token) throw new UnauthorizedException('Missing auth token')
      console.log(token);
    try {
      const payload = this.jwtService.verify(token, { secret: jwtConstants.secret })
      console.log(payload);
      // Attach to socket for later usage
      ;(client.data as any).user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid auth token')
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const authHeader = client.handshake.headers.authorization
    if (!authHeader) return undefined
    const [type, token] = authHeader.split(' ')
    return type === 'Bearer' ? token : undefined
  }
}