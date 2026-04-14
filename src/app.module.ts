import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { GracefulShutdownModule } from 'nestjs-graceful-shutdown';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { closeConnection } from './infrastructure/database/database.provider';
import { AuthModule } from './modules/auth/auth.module';
import { ProductModule } from './modules/product/product.module';
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
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    ProductModule,
    AuthModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerModule,
    },
  ],
})
export class AppModule {}
