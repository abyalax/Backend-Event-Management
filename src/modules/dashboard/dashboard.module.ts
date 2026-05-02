import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';
import { DatabaseModule } from '~/infrastructure/database/database.module';
import { dashboardProvider } from './dashboard.provider';
import { DashboardController } from './dashboard.controller';
import { DashboardCacheService } from './dashboard-cache.service';

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
  providers: dashboardProvider,
  controllers: [DashboardController],
  exports: [DashboardCacheService],
})
export class DashboardModule {}
