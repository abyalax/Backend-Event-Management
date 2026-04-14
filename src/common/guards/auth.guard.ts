import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { env } from '~/config/env';
import { EMessage } from '../types/response';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const access_token: string = request.signedCookies.access_token ?? '';

    if (!access_token || access_token === '') throw new UnauthorizedException(EMessage.TOKEN_NOT_FOUND);
    try {
      const verifyToken = await this.jwtService.verifyAsync(access_token, {
        secret: env.JWT_SECRET,
      });
      if (verifyToken) {
        return true;
      } else {
        throw new UnauthorizedException(EMessage.TOKEN_INVALID);
      }
    } catch (_e) {
      console.log('AuthGuard: ', _e.message);
      throw new UnauthorizedException(EMessage.TOKEN_EXPIRED);
    }
  }
}
