import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { EMessage } from '../types/response';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(CONFIG_SERVICE)
    private readonly configService: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token: string = request.signedCookies.access_token;
    if (!token) throw new UnauthorizedException(EMessage.TOKEN_NOT_FOUND);

    try {
      const verifyToken = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      request.user = {
        name: verifyToken.name,
        email: verifyToken.email,
        id: verifyToken.id,
        permissions: verifyToken?.permissions ?? [],
      };
      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(EMessage.TOKEN_EXPIRED);
      } else if (error.name === 'JsonWebTokenError') {
        throw new UnauthorizedException(EMessage.TOKEN_INVALID);
      } else if (error.name === 'NotBeforeError') {
        throw new UnauthorizedException(EMessage.TOKEN_NOT_BEFORE);
      } else {
        throw new UnauthorizedException(EMessage.TOKEN_ERROR);
      }
    }
  }
}
