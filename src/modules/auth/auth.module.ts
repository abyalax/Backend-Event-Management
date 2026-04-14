import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { env } from '~/config/env';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UserModule } from '../user/user.module';
import { userProvider } from '../user/user.provider';
import { UserService } from '../user/user.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UserModule,
    DatabaseModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      privateKey: env.JWT_PRIVATE_KEY,
      publicKey: env.JWT_PUBLIC_KEY,
    }),
  ],
  controllers: [AuthController],
  providers: [...userProvider, AuthService, UserService, AuthGuard],
  exports: [AuthGuard, JwtModule, UserService],
})
export class AuthModule {}
