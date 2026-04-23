import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GlobalExceptionFilter } from './common/filters/global.filter';
import { LoggerModule } from './common/logger/logger.module';
import { ConfigModule } from './infrastructure/config/config.module';
import { CONFIG_SERVICE, ConfigService } from './infrastructure/config/config.provider';
import { closeConnection } from './infrastructure/database/database.provider';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventCategoryModule } from './modules/event-categories/event-category.module';
import { EventModule } from './modules/events/event.module';
import { TicketModule } from './modules/tickets/ticket.module';
import { UserModule } from './modules/users/user.module';
import { RoleModule } from './modules/roles/role.module';
import { StorageModule } from './modules/storage/storage.module';

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
    ConfigModule,
    LoggerModule,
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60000, limit: 20 }],
    }),
    RedisModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST'),
        port: configService.get('REDIS_PORT'),
        password: configService.get('REDIS_PASSWORD'),
      }),
      inject: [CONFIG_SERVICE],
    }),
    ...gracefulShutdownImports,
    AuthModule,
    UserModule,
    RoleModule,
    EventModule,
    EventCategoryModule,
    TicketModule,
    StorageModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      }),
    },
  ],
})
export class AppModule {}
