import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import z from 'zod';
import { validateSchema } from '~/common/helpers/validation';
import { QueryRoleDto } from '~/modules/roles/dto/query-role.dto';
import { setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Module Roles', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Response Success', () => {
    let access_token: string;
    let refresh_token: string;

    beforeAll(async () => {
      const credentials = {
        email: USER.email,
        password: USER.password,
      };
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);

      expect(res.headers['set-cookie']).toBeDefined();
      const cookies = res.headers['set-cookie'];
      access_token = extractHttpOnlyCookie('access_token', cookies);
      refresh_token = extractHttpOnlyCookie('refresh_token', cookies);

      expect(refresh_token).toBeDefined();
      expect(access_token).toBeDefined();
    });

    test('GET /roles + QueryRoleDto - Verify Eager Loading', async () => {
      const query: QueryRoleDto = { page: 1, limit: 10 };
      const res = await request(app.getHttpServer())
        .get('/roles')
        .query(query)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get roles successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.data).toBeDefined();
      expect(Array.isArray(res.body.data.data)).toBe(true);

      // Verify eager loading - check if permissions are loaded
      const roles = res.body.data.data;
      if (roles.length > 0) {
        const firstRole = roles[0];
        expect(firstRole).toHaveProperty('id');
        expect(firstRole).toHaveProperty('name');
        expect(firstRole).toHaveProperty('permissions');
        expect(Array.isArray(firstRole.permissions)).toBe(true);

        // Verify permissions structure
        if (firstRole.permissions.length > 0) {
          const firstPermission = firstRole.permissions[0];
          expect(firstPermission).toHaveProperty('id');
          expect(firstPermission).toHaveProperty('key');
          expect(firstPermission).toHaveProperty('name');
        }
      }

      // Verify meta structure
      const meta = res.body.data?.meta;
      const MetaResponseSchema = z.object({
        currentPage: z.number(),
        itemsPerPage: z.number(),
        totalItems: z.number(),
        totalPages: z.number(),
        sortBy: z.array(z.array(z.string())),
      });

      const validated = await validateSchema(MetaResponseSchema, meta);
      expect(validated).toBeDefined();
    });

    let createdRoleId: number;

    test('POST /roles (Create Role)', async () => {
      const payload = {
        name: 'Test Role',
        permissions: [], // Empty permissions array is required
      };

      const res = await request(app.getHttpServer())
        .post('/roles')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('role created successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe(payload.name);

      createdRoleId = res.body.data.id;
    });

    test('GET /roles/:id (Get Role By ID) - Verify Eager Loading', async () => {
      expect(createdRoleId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/roles/${createdRoleId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get role successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(createdRoleId);
      expect(res.body.data.name).toBeDefined();

      // Verify eager loading - permissions should be loaded
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    test('PATCH /roles/:id (Update Role)', async () => {
      const updatePayload = {
        name: 'Test Role Updated',
      };

      const res = await request(app.getHttpServer())
        .patch(`/roles/${createdRoleId}`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role updated successfully');
      expect(res.body.data.name).toBe(updatePayload.name);
    });

    test('DELETE /roles/:id (Delete Role)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/roles/${createdRoleId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role deleted successfully');
      expect(res.body.data).toBe(true);
    });

    test('GET /roles/1 (Get Admin Role) - Verify Full Eager Loading', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/1')
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('get role successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.name).toBe('Admin');

      // Verify eager loading - permissions should be loaded and not empty
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBeGreaterThan(0);

      // Verify permission structure
      const permissions = res.body.data.permissions;
      const firstPermission = permissions[0];
      expect(firstPermission).toHaveProperty('id');
      expect(firstPermission).toHaveProperty('key');
      expect(firstPermission).toHaveProperty('name');
      expect(typeof firstPermission.id).toBe('number');
      expect(typeof firstPermission.key).toBe('string');
      expect(typeof firstPermission.name).toBe('string');
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
