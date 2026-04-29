import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { Permission } from '~/modules/auth/entity/permission.entity';
import { RoleDto } from '~/modules/role-permissions/dto/role-permission.dto';
import { Role } from '~/modules/role-permissions/entity/role.entity';
import { cleanupApplication, setupApplication } from '~/test/setup_e2e';
import { extractHttpOnlyCookie } from '~/test/utils';

const USER = {
  email: 'admin@gmail.com',
  password: 'password',
};

const testPassword = 'sdvdsvfdvdfw123';

describe('Module User Role Management', () => {
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

    test('POST /users (Create User for role assignment testing)', async () => {
      const payload = {
        name: 'Test User Role Assignment',
        email: 'testrole@example.com',
        password: testPassword,
      };

      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('user created successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.name).toBe(payload.name);
      expect(res.body.data.email).toBe(payload.email);

      const createdUserId = res.body.data.id;
      console.log('Created user ID:', createdUserId); // Debug log

      // Clean up
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);
    });

    test('POST /users/:id/roles (Assign Roles to User)', async () => {
      // First create a user
      const userPayload = {
        name: 'Test User Role Assignment',
        email: 'testrole@example.com',
        password: testPassword,
      };

      const userRes = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(userPayload);

      expect(userRes.status).toBe(201);
      const createdUserId = userRes.body.data.id;

      // Use static role IDs for testing
      const roleIds = [1, 2]; // Admin and Event Manager roles

      const res = await request(app.getHttpServer())
        .post(`/users/${createdUserId}/roles`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ roleIds });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('roles assigned successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBe(createdUserId);
      expect(res.body.data).toHaveProperty('roles');
      expect(Array.isArray(res.body.data.roles)).toBe(true);
      expect(res.body.data.roles.length).toBe(roleIds.length);

      // Verify the assigned roles are correct
      const assignedRoles: RoleDto[] = res.body.data.roles;
      expect(assignedRoles.length).toBe(roleIds.length);

      assignedRoles.forEach((role) => {
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('permissions');
        expect(Array.isArray(role.permissions)).toBe(true);
        expect(typeof role.id).toBe('number');
        expect(typeof role.name).toBe('string');
        expect(roleIds).toContain(role.id);
      });

      // Clean up
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);
    });

    test('GET /users/:id/roles (Get User Roles)', async () => {
      // First create a user
      const userPayload = {
        name: 'Test User Get Roles',
        email: 'testgetroles@example.com',
        password: testPassword,
      };

      const userRes = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(userPayload);

      expect(userRes.status).toBe(201);
      const createdUserId = userRes.body.data.id;

      // Test initially empty roles
      const emptyRes = await request(app.getHttpServer())
        .get(`/users/${createdUserId}/roles`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(emptyRes.status).toBe(200);
      expect(emptyRes.body.message).toBe('user roles retrieved successfully');
      expect(emptyRes.body.data).toBeDefined();
      expect(emptyRes.body.data.id).toBe(createdUserId);
      expect(emptyRes.body.data).toHaveProperty('roles');
      expect(Array.isArray(emptyRes.body.data.roles)).toBe(true);
      expect(emptyRes.body.data.roles.length).toBe(0);

      // Assign roles
      const roleIds = [1, 2];
      await request(app.getHttpServer())
        .post(`/users/${createdUserId}/roles`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ roleIds });

      // Test with assigned roles
      const res = await request(app.getHttpServer())
        .get(`/users/${createdUserId}/roles`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('user roles retrieved successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('roles');
      expect(Array.isArray(res.body.data.roles)).toBe(true);
      expect(res.body.data.roles.length).toBeGreaterThan(0);

      // Verify role structure with permissions
      const roles: RoleDto[] = res.body.data.roles;
      roles.forEach((role: RoleDto) => {
        expect(role).toHaveProperty('id');
        expect(role).toHaveProperty('name');
        expect(role).toHaveProperty('permissions');
        expect(Array.isArray(role.permissions)).toBe(true);
        expect(typeof role.id).toBe('number');
        expect(typeof role.name).toBe('string');

        // Verify permissions structure if present
        if (role.permissions.length > 0) {
          role.permissions.forEach((permission: Permission) => {
            expect(permission).toHaveProperty('id');
            expect(permission).toHaveProperty('key');
            expect(permission).toHaveProperty('name');
            expect(typeof permission.id).toBe('number');
            expect(typeof permission.key).toBe('string');
            expect(typeof permission.name).toBe('string');
          });
        }
      });

      // Clean up
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);
    });

    test('DELETE /users/:id/roles/:roleId (Remove Role from User)', async () => {
      // First create a user
      const userPayload = {
        name: 'Test User Remove Role',
        email: 'testremoverole@example.com',
        password: testPassword,
      };

      const userRes = await request(app.getHttpServer())
        .post('/users')
        .set('Cookie', [`access_token=s:${access_token}`])
        .send(userPayload);

      expect(userRes.status).toBe(201);
      const createdUserId = userRes.body.data.id;

      // Assign roles first
      const roleIds = [1, 2];
      await request(app.getHttpServer())
        .post(`/users/${createdUserId}/roles`)
        .set('Cookie', [`access_token=s:${access_token}`])
        .send({ roleIds });

      // Get current roles
      const rolesRes = await request(app.getHttpServer())
        .get(`/users/${createdUserId}/roles`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(rolesRes.status).toBe(200);
      const currentRoles = rolesRes.body.data.roles;
      expect(currentRoles.length).toBeGreaterThan(0);

      // Remove the first role
      const roleToRemove = currentRoles[0];
      const roleIdToRemove = roleToRemove.id;

      const res = await request(app.getHttpServer())
        .delete(`/users/${createdUserId}/roles/${roleIdToRemove}`)
        .set('Cookie', [`access_token=s:${access_token}`]);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('role removed successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toHaveProperty('roles');
      expect(Array.isArray(res.body.data.roles)).toBe(true);

      // Verify role was removed from the response
      const remainingRoles: Role[] = res.body.data.roles;
      const removedRoleExists = remainingRoles.some((r: Role) => r.id === roleIdToRemove);
      expect(removedRoleExists).toBe(false);

      // Clean up
      await request(app.getHttpServer())
        .delete(`/users/${createdUserId}`)
        .set('Cookie', [`access_token=s:${access_token}`]);
    });
  });

  afterAll(async () => {
    await cleanupApplication(app, moduleFixture);
  });
});
