import { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '~/app.module';
import { env } from '~/config/env';

let cachedApp: NestExpressApplication | null = null;
let cachedModule: TestingModule | null = null;

export const setupApplication = async (): Promise<[NestExpressApplication, TestingModule]> => {
  if (cachedApp && cachedModule) return [cachedApp, cachedModule];

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: NestExpressApplication = moduleFixture.createNestApplication();
  app.use(cookieParser(env.COOKIE_SECRET));
  await app.init();

  cachedApp = app;
  cachedModule = moduleFixture;
  return [app, moduleFixture];
};
