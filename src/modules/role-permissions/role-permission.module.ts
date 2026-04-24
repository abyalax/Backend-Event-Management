import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { RedisService } from '~/infrastructure/redis/redis.service';
import { RoleCacheService } from './role-permission-cache.service';
import { RoleController } from './role-permission.controller';
import { roleProvider } from './role-permission.provider';
import { RoleService } from './role-permission.service';

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
  providers: [...roleProvider, CacheService, RedisService, RoleCacheService, RoleService, JwtGuard, PermissionsGuard],
  controllers: [RoleController],
  exports: [RoleService, ...roleProvider],
})
export class RolePermissionModule {}
