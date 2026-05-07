import { faker } from '@faker-js/faker';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { validateDto } from '~/common/helpers/validation';
import { envSchema } from '~/infrastructure/config/config.schema';
import { SignUpDto } from '~/modules/auth/dto/sign-up.dto';
import { UserDto } from '~/modules/users/dto/user.dto';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { USER } from '../common/constant';
import { extractHttpOnlyCookie, extractSignedCookieToken } from '../utils';

describe('Module Authentication', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;
  let jwtService: JwtService;

  const env = envSchema.parse(process.env);

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
    jwtService = new JwtService({
      secret: env.JWT_SECRET,
      privateKey: env.JWT_PRIVATE_KEY,
      publicKey: env.JWT_PUBLIC_KEY,
    });
  });

  test('POST /auth/login', async () => {
    const credentials = {
      email: USER.LOGIN.email,
      password: USER.LOGIN.password,
    };
    const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);
    expect(res.headers['set-cookie']).toBeDefined();

    const cookies = res.headers['set-cookie'];

    const access_token = extractHttpOnlyCookie('access_token', cookies) ?? '';
    const refresh_token = extractHttpOnlyCookie('refresh_token', cookies) ?? '';

    expect(access_token).toBeDefined();
    expect(refresh_token).toBeDefined();

    const access_token_raw = extractSignedCookieToken(access_token);
    const refresh_token_raw = extractSignedCookieToken(refresh_token);

    expect(() => jwtService.verify(access_token_raw, { secret: env.JWT_SECRET })).not.toThrow();
    expect(() => jwtService.verify(refresh_token_raw, { secret: env.JWT_REFRESH_SECRET })).not.toThrow();

    const payload = jwtService.verify(access_token_raw);
    expect(payload).toHaveProperty('id');
    expect(payload).toHaveProperty('exp');
    expect(payload).toHaveProperty('iat');
    expect(payload).toHaveProperty('email');
    expect(payload).toHaveProperty('permissions');
    expect(payload.email).toEqual(USER.LOGIN.email);

    const data = res.body.data;
    const validated = await validateDto(UserDto, data);
    expect(validated).toBeInstanceOf(UserDto);
  });

  test('POST /auth/register', async () => {
    const name = faker.person.fullName();
    const [firstName, lastName] = name.toLowerCase().split(' ');
    const email = faker.internet.email({
      firstName,
      lastName,
    });

    const credentials = {
      name,
      email,
      password: USER.LOGIN.password,
    };

    const validated = await validateDto(SignUpDto, credentials);
    const res = await request(app.getHttpServer()).post('/auth/register').send(validated);
    expect(res.body).toEqual(
      expect.objectContaining({
        message: expect.anything(),
        data: expect.objectContaining({
          id: expect.anything(),
          name: expect.anything(),
          email: expect.anything(),
        }),
      }),
    );
  });

  test('POST /auth/refresh - token refresh flow', async () => {
    // Step 1: Login
    const credentials = {
      email: USER.LOGIN.email,
      password: USER.LOGIN.password,
    };

    const loginRes = await request(app.getHttpServer()).post('/auth/login').send(credentials);
    expect(loginRes.status).toBe(HttpStatus.ACCEPTED);
    expect(loginRes.headers['set-cookie']).toBeDefined();

    const cookies = loginRes.headers['set-cookie'];
    const access_token = extractHttpOnlyCookie('access_token', cookies) ?? '';
    const refresh_token = extractHttpOnlyCookie('refresh_token', cookies) ?? '';

    expect(access_token).toBeDefined();
    expect(refresh_token).toBeDefined();

    // Step 2: Access protected endpoint immediately - should be accepted
    const protectedRes = await request(app.getHttpServer()).get('/auth/permissions').set('Cookie', cookies);
    expect(protectedRes.status).toBe(HttpStatus.OK);

    // Step 3: Refresh token
    const refreshRes = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', cookies);
    expect(refreshRes.status).toBe(HttpStatus.OK);
    expect(refreshRes.body.message).toBe('getting new access_token');

    // Get new cookies from refresh response
    const newCookies = refreshRes.headers['set-cookie'];
    const new_access_token = extractHttpOnlyCookie('access_token', newCookies) ?? '';
    expect(new_access_token).toBeDefined();

    // Step 4: Access protected endpoint with new token - should be accepted
    let combinedCookies: string[] = [];

    // Handle original cookies (remove old access_token)
    if (Array.isArray(cookies)) {
      combinedCookies = [...cookies.filter((c: string) => !c.startsWith('access_token='))];
    } else {
      combinedCookies = [cookies];
    }

    // Add new cookies (only access_token)
    if (Array.isArray(newCookies)) {
      combinedCookies = [...combinedCookies, ...newCookies.filter((c: string) => c.startsWith('access_token='))];
    } else {
      combinedCookies = [...combinedCookies, newCookies];
    }

    const newProtectedRes = await request(app.getHttpServer()).get('/auth/permissions').set('Cookie', combinedCookies);

    expect(newProtectedRes.status).toBe(HttpStatus.OK);

    // Step 5: Try to refresh without cookies - should be rejected
    const noCookieRefreshRes = await request(app.getHttpServer()).post('/auth/refresh');
    expect(noCookieRefreshRes.status).toBe(HttpStatus.UNAUTHORIZED);

    // Step 6: Try to refresh with invalid refresh token - should be rejected
    const invalidRefreshRes = await request(app.getHttpServer()).post('/auth/refresh').set('Cookie', 'refresh_token=invalid_token');
    expect(invalidRefreshRes.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
