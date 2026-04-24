import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import z from 'zod';
import { validateSchema } from '~/common/helpers/validation';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { QueryRolePermissionDto } from '~/modules/role-permissions/dto/query-role-permission.dto';
import { setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

describe('Module Role Permissions', () => {
  let app: INestApplication<App>;
  let moduleFixture: TestingModule;

  beforeAll(async () => {
    [app, moduleFixture] = await setupApplication();
  });

  describe('Response Success', () => {
    let access_token: string;
    let refresh_token: string;
    let createdRoleId: number;

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

    test('GET /roles + QueryRolePermissionDto - Verify Eager Loading', async () => {
      const query: QueryRolePermissionDto = { page: 1, limit: 10 };
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

    test('POST /roles (Create Role)', async () => {
      const payload = {
        name: 'Test Role Permission',
        permissionIds: [1, 2], // Create with permissions
      };

      const res = await request(app.getHttpServer())
        .post('/roles')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('role created successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBe(payload.permissionIds.length);

      // Verify permissions are correctly assigned
      const assignedPermissions: Permission[] = res.body.data.permissions;
      assignedPermissions.forEach((permission: Permission) => {
        expect(payload.permissionIds).toContain(permission.id);
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
      });

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

    test('GET /roles/:id/permissions (Get Role Permissions)', async () => {
      expect(createdRoleId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/roles/${createdRoleId}/permissions`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role permissions retrieved successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(createdRoleId);
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    test('POST /roles/:id/permissions (Assign Permissions to Role)', async () => {
      expect(createdRoleId).toBeDefined();

      // Use static permission IDs from mock data for testing
      const permissionIds = [1, 2]; // user:create and user:read permissions

      // Create mock permission objects for type assertion
      const mockPermissions: Permission[] = [
        { id: 1, key: 'user:create', name: 'Create User', rolePermissions: [] },
        { id: 2, key: 'user:read', name: 'Read User', rolePermissions: [] },
      ];

      // Assert permission structure
      mockPermissions.forEach((permission: Permission) => {
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
      });

      const res = await request(app.getHttpServer())
        .post(`/roles/${createdRoleId}/permissions`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ permissionIds });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('permissions assigned successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(createdRoleId);
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBe(permissionIds.length);

      // Verify the assigned permissions are correct
      const assignedPermissions: Permission[] = res.body.data.permissions;
      expect(assignedPermissions.length).toBe(permissionIds.length);

      // Assert permission structure for assigned permissions
      assignedPermissions.forEach((permission: Permission) => {
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
        expect(permissionIds).toContain(permission.id);
      });
    });

    test('GET /roles/:id/permissions (Verify Assigned Permissions)', async () => {
      expect(createdRoleId).toBeDefined();

      const res = await request(app.getHttpServer())
        .get(`/roles/${createdRoleId}/permissions`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role permissions retrieved successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBeGreaterThan(0);

      // Verify permission structure with type assertion
      const permissions: Permission[] = res.body.data.permissions;
      permissions.forEach((permission: Permission) => {
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
      });
    });

    test('PATCH /roles/:id (Update Role)', async () => {
      const updatePayload = {
        name: 'Test Role Permission Updated',
      };

      const res = await request(app.getHttpServer())
        .patch(`/roles/${createdRoleId}`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role updated successfully');
      expect(res.body.data.name).toBe(updatePayload.name);
    });

    test('PATCH /roles/:id (Update Role with Permissions)', async () => {
      const updatePayload = {
        name: 'Test Role with Permissions Updated',
        permissionIds: [1, 3, 5], // Update permissions
      };

      const res = await request(app.getHttpServer())
        .patch(`/roles/${createdRoleId}`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(updatePayload);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role updated successfully');
      expect(res.body.data.name).toBe(updatePayload.name);
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
      expect(res.body.data.permissions.length).toBe(updatePayload.permissionIds.length);

      // Verify the assigned permissions are correct
      const assignedPermissions = res.body.data.permissions;
      assignedPermissions.forEach((permission: any) => {
        expect(updatePayload.permissionIds).toContain(permission.id);
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
      });
    });

    test('DELETE /roles/:id/permissions/:permissionId (Remove Permission from Role)', async () => {
      expect(createdRoleId).toBeDefined();

      // Get current permissions
      const permissionsRes = await request(app.getHttpServer())
        .get(`/roles/${createdRoleId}/permissions`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(permissionsRes.status).toBe(200);
      const currentPermissions: Permission[] = permissionsRes.body.data.permissions;
      expect(currentPermissions.length).toBeGreaterThan(0);

      // Assert permission structure before removal
      currentPermissions.forEach((permission: Permission) => {
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
      });

      // Remove the first permission
      const permissionToRemove = currentPermissions[0];
      const permissionIdToRemove = permissionToRemove.id;

      const res = await request(app.getHttpServer())
        .delete(`/roles/${createdRoleId}/permissions/${permissionIdToRemove}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('permission removed successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data).toHaveProperty('permissions');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);

      // Verify permission was removed from the response
      const removedPermissions: Permission[] = res.body.data.permissions;
      const removedPermissionExists = removedPermissions.some((p: Permission) => p.id === permissionIdToRemove);
      expect(removedPermissionExists).toBe(false);
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

      // Verify permission structure with type assertion
      const permissions: Permission[] = res.body.data.permissions;
      permissions.forEach((permission: Permission) => {
        expect(permission).toHaveProperty('id');
        expect(permission).toHaveProperty('key');
        expect(permission).toHaveProperty('name');
        expect(typeof permission.id).toBe('number');
        expect(typeof permission.key).toBe('string');
        expect(typeof permission.name).toBe('string');
      });
    });
  });

  describe('Response Error Cases', () => {
    let access_token: string;

    beforeAll(async () => {
      const credentials = {
        email: USER.email,
        password: USER.password,
      };
      const res = await request(app.getHttpServer()).post('/auth/login').send(credentials);
      access_token = extractHttpOnlyCookie('access_token', res.headers['set-cookie']);
    });

    test('POST /roles (Create Role with Invalid Data)', async () => {
      const payload = {
        name: '', // Empty name should fail validation
      };

      const res = await request(app.getHttpServer())
        .post('/roles')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.message).toBeDefined();
    });

    test('GET /roles/:id (Get Non-existent Role)', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/99999')
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    test('POST /roles/:id/permissions (Assign Permissions to Non-existent Role)', async () => {
      const res = await request(app.getHttpServer())
        .post('/roles/99999/permissions')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ permissionIds: [1, 2] });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    test('DELETE /roles/:id/permissions/:permissionId (Remove Permission from Non-existent Role)', async () => {
      const res = await request(app.getHttpServer())
        .delete('/roles/99999/permissions/1')
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });

    test('GET /roles/:id/permissions (Get Permissions of Non-existent Role)', async () => {
      const res = await request(app.getHttpServer())
        .get('/roles/99999/permissions')
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('not found');
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleFixture.close();
  });
});
