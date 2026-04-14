import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { env } from '~/config/env';
import { UserService } from '~/modules/user/user.service';
import { EMessage } from '../types/response';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token: string = request.signedCookies.access_token;
    if (!token) throw new UnauthorizedException(EMessage.TOKEN_NOT_FOUND);

    try {
      const verifyToken = await this.jwtService.verifyAsync(token, {
        secret: env.JWT_SECRET,
      });
      if (verifyToken) {
        const user = await this.userService.findOneBy({ id: verifyToken.sub });
        request['user'] = {
          name: user.name,
          email: user.email,
          password: '',
          id: user.id,
          sub: user.id,
          roles: user.roles ?? [],
          permissions: user?.roles?.flatMap((role) => role.permissions) ?? [],
        };
        return true;
      }
      throw new UnauthorizedException();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expired');
      } else {
        return false;
      }
    }
  }
}
