import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { RoleController } from './role-permission.controller';
import { roleProvider } from './role-permission.provider';

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
  providers: roleProvider,
  controllers: [RoleController],
})
export class RolePermissionModule {}
