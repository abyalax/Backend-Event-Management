import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { env } from '~/config/env';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { UserController } from './user.controller';
import { userProvider } from './user.provider';
import { UserService } from './user.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.register({
      secret: env.JWT_SECRET,
      privateKey: env.JWT_PRIVATE_KEY,
      publicKey: env.JWT_PUBLIC_KEY,
    }),
  ],
  providers: [...userProvider, UserService, JwtGuard, PermissionsGuard],
  controllers: [UserController],
  exports: [UserService, ...userProvider],
})
export class UserModule {}
