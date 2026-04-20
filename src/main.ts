import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global.filter';
import { envSchema } from './config/env';

async function bootstrap() {
  const env = envSchema.parse(process.env);
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
  console.log(`Nest Application running on http://localhost:${env.PORT}`);
}

bootstrap().catch((err) => console.error(err));
