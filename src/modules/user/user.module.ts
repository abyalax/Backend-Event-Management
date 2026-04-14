import { Module } from '@nestjs/common';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { UserController } from './user.controller';
import { userProvider } from './user.provider';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule],
  providers: [...userProvider, UserService],
  controllers: [UserController],
  exports: [UserService, ...userProvider],
})
export class UserModule {}
