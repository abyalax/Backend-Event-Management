import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import 'reflect-metadata';
import { GlobalExceptionFilter } from './common/filters/global.filter';
import { env } from './config/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalException = new GlobalExceptionFilter();

  setupGracefulShutdown({ app });

  app.use(cookieParser(env.COOKIE_SECRET));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        excludeExtraneousValues: true,
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(globalException);

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  await app.listen(env.PORT);
}
bootstrap()
  .then(() => console.log(`Nest Aplication running on http://localhost:${env.PORT}`))
  .catch((err) => console.log(err));
