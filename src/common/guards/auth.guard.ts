import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { EMessage } from '../types/response';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CONFIG_SERVICE)
    private readonly configService: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const access_token: string = request.signedCookies.access_token ?? '';

    if (!access_token || access_token === '') throw new UnauthorizedException(EMessage.TOKEN_NOT_FOUND);
    try {
      const verifyToken = await this.jwtService.verifyAsync(access_token, {
        secret: this.configService.get('JWT_SECRET'),
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
