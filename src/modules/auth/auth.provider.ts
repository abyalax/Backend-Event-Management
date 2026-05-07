import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { AuthConfig } from './auth.interface';
import { CONFIG_PROVIDER } from '~/common/constants/provider';
import { Provider } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { AuthService } from './auth.service';
export { AuthConfig } from './auth.interface';

export const authProvider: Provider[] = [
  AuthService,
  JwtGuard,
  PermissionsGuard,
  Reflector,
  {
    provide: CONFIG_PROVIDER.AUTH,
    inject: [CONFIG_SERVICE],
    useFactory: (configService: ConfigService): AuthConfig => ({
      jwtSecret: configService.get('JWT_SECRET'),
      jwtRefreshSecret: configService.get('JWT_REFRESH_SECRET'),
      jwtPrivateKey: configService.get('JWT_PRIVATE_KEY'),
      jwtPublicKey: configService.get('JWT_PUBLIC_KEY'),
      jwtExpiration: configService.get('JWT_EXPIRATION'),
      jwtRefreshExpiration: configService.get('JWT_REFRESH_EXPIRATION'),
    }),
  },
];
