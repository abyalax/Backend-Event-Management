import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { envSchema } from './infrastructure/config/config.schema';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const env = envSchema.parse(process.env);
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  setupGracefulShutdown({ app });

  app.use(cookieParser(env.COOKIE_SECRET));

  app.enableCors({
    origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.enableShutdownHooks();

  await app.listen(env.PORT);
  logger.log(`Nest Application running on http://localhost:${env.PORT}`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Bootstrap failed', err);
});
