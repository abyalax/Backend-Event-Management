import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { UserCacheService } from './user-cache.service';
import { UserController } from './user.controller';
import { userProvider } from './user.provider';
import { UserService } from './user.service';

@Module({
  imports: [
    DatabaseModule,
    JwtModule.registerAsync({
      inject: [CONFIG_SERVICE],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        privateKey: configService.get('JWT_PRIVATE_KEY'),
        publicKey: configService.get('JWT_PUBLIC_KEY'),
      }),
    }),
  ],
  providers: [...userProvider, CacheService, RedisService, UserCacheService, UserService, JwtGuard, PermissionsGuard],
  controllers: [UserController],
  exports: [UserService, ...userProvider],
})
export class UserModule {}
