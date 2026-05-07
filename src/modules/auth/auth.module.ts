import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { UserModule } from '../users/user.module';
import { AuthController } from './auth.controller';
import { authProvider } from './auth.provider';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        privateKey: configService.get('JWT_PRIVATE_KEY'),
        publicKey: configService.get('JWT_PUBLIC_KEY'),
        verifyOptions: {},
      }),
    }),
  ],
  controllers: [AuthController],
  providers: authProvider,
})
export class AuthModule {}
