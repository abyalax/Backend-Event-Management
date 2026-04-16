import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RolesGuard } from './common/guards/roles.guard';
import { EnvValidator } from './infrastructure/config/config.provider';
import { closeConnection } from './infrastructure/database/database.provider';
import { AuthModule } from './modules/auth/auth.module';
import { EventModule } from './modules/event/event.module';
import { UserModule } from './modules/user/user.module';

const gracefulShutdownImports =
  process.env.NODE_ENV === 'test'
    ? []
    : [
        GracefulShutdownModule.forRoot({
          cleanup: async (_, signal) => {
            console.log(`Shutting down gracefully due to signal: ${signal}`);
            await closeConnection();
            console.log('Database connection closed.');
          },
          gracefulShutdownTimeout: Number(process.env.GRACEFUL_SHUTDOWN_TIMEOUT ?? 10000),
          keepNodeProcessAlive: true,
        }),
      ];

@Module({
  imports: [
    ...gracefulShutdownImports,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 20 }], // max 20 request/menit
    }),
    AuthModule,
    UserModule,
    EventModule,
  ],
  controllers: [AppController],
  providers: [
    EnvValidator,
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
