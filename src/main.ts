import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { setupGracefulShutdown } from 'nestjs-graceful-shutdown';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { envSchema } from './infrastructure/config/config.schema';

async function bootstrap() {
  const env = envSchema.parse(process.env);
  const app = await NestFactory.create(AppModule);

  setupGracefulShutdown({ app });

  app.use(cookieParser(env.COOKIE_SECRET));

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  });

  app.enableShutdownHooks();

  await app.listen(env.PORT);
  console.log(`Nest Application running on http://localhost:${env.PORT}`);
}

bootstrap().catch((err) => console.error(err));
