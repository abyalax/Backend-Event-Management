import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { ADMIN } from '~/infrastructure/database/const/shared-data';
import { extractHttpOnlyCookie } from '~/test/utils';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

export const loginAdmin = async (app: INestApplication<App>): Promise<AuthSession> => {
  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email: ADMIN.email,
    password: ADMIN.password,
  });

  const cookies = response.headers['set-cookie'];
  const accessToken = extractHttpOnlyCookie('access_token', cookies);
  const refreshToken = extractHttpOnlyCookie('refresh_token', cookies);

  return { accessToken, refreshToken };
};
