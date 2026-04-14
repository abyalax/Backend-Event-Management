import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';

import * as request from 'supertest';
import { App } from 'supertest/types';

import { setupApplication } from './setup_e2e';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  it('GET: /health', () => {
    return request(app.getHttpServer()).get('/health').expect(200).expect('Hello World! Nest ready to serve!!');
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
