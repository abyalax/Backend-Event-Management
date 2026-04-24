import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '~/common/constants/database';
import { plainToInstance } from 'class-transformer';

import { paginate, PaginateQuery } from 'nestjs-paginate';
import type { FindOneOptions, Repository } from 'typeorm';
import type { CreateRoleDto } from './dto/create-role-permission.dto';
import type { UpdateRoleDto } from './dto/update-role-permission.dto';
import { ROLE_PAGINATION_CONFIG } from './role-permission-pagination.config';
import { Role } from './entity/role.entity';
import { RolePermission } from './entity/role-permissions.entity';
import { RoleDto } from './dto/role-permission.dto';

@Injectable()
export class RoleService {
  constructor(
    @Inject(REPOSITORY.ROLE)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async list(query: PaginateQuery) {
    const paginatedRoles = await paginate(query, this.roleRepository, ROLE_PAGINATION_CONFIG);

    const roles = plainToInstance(RoleDto, paginatedRoles.data, {
      excludeExtraneousValues: true,
    });

    return {
      ...paginatedRoles,
      data: roles,
    };
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find();
  }

  async create(createDto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create({
      name: createDto.name,
    });
    const savedRole = await this.roleRepository.save(role);

    // Create role-permission relationships if permissionIds provided
    if (createDto.permissionIds && createDto.permissionIds.length > 0) {
      const rolePermissions = createDto.permissionIds.map((permissionId) =>
        this.roleRepository.manager.create(RolePermission, {
          idRole: savedRole.id,
          idPermission: permissionId,
        }),
      );

      await this.roleRepository.manager.save(rolePermissions);
    }

    // Return role with eager loaded permissions
    const roleWithPermissions = await this.findOne({
      where: { id: savedRole.id },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!roleWithPermissions) throw new NotFoundException(`Role with ID ${savedRole.id} not found after creation`);

    return roleWithPermissions;
  }

  async findOne(params: FindOneOptions<Role>) {
    return await this.roleRepository.findOne({
      ...params,
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    return await this.roleRepository.manager.transaction(async (manager) => {
      const role = await manager.findOne(Role, {
        where: { id },
        relations: ['rolePermissions'],
      });

      if (!role) throw new NotFoundException(`Role with ID ${id} not found`);

      // Update role name if provided
      if (updateRoleDto.name) {
        role.name = updateRoleDto.name;
        await manager.save(role);
      }

      // Update permissions if permissionIds provided
      if (updateRoleDto.permissionIds) {
        // Remove existing role permissions
        await manager.delete(RolePermission, { idRole: id });
        // Add new role permissions
        if (updateRoleDto.permissionIds.length > 0) {
          const rolePermissions = updateRoleDto.permissionIds.map((permissionId) =>
            manager.create(RolePermission, {
              idRole: id,
              idPermission: permissionId,
            }),
          );
          await manager.save(rolePermissions);
        }
      }

      // Return updated role with permissions
      const updatedRole = await manager.findOne(Role, {
        where: { id },
        relations: ['rolePermissions', 'rolePermissions.permission'],
      });

      if (!updatedRole) throw new NotFoundException(`Role with ID ${id} not found after update`);

      return updatedRole;
    });
  }

  async remove(id: number): Promise<boolean> {
    return await this.roleRepository.manager.transaction(async (manager) => {
      // First, delete role_permissions records
      await manager.delete(RolePermission, { idRole: id });
      // Then, delete the role
      const result = await manager.delete(Role, { id });
      return (result.affected ?? 0) > 0;
    });
  }

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions'],
    });

    if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);
    // Remove existing role permissions
    await this.roleRepository.manager.delete(RolePermission, { idRole: roleId });
    // Add new role permissions
    const rolePermissions = permissionIds.map((permissionId) =>
      this.roleRepository.manager.create(RolePermission, {
        idRole: roleId,
        idPermission: permissionId,
      }),
    );

    await this.roleRepository.manager.save(rolePermissions);
    // Return updated role with permissions
    const updatedRole = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!updatedRole) throw new NotFoundException(`Role with ID ${roleId} not found after update`);

    return updatedRole;
  }

  async removePermission(roleId: number, permissionId: number): Promise<Role> {
    return await this.roleRepository.manager.transaction(async (manager) => {
      const role = await manager.findOne(Role, {
        where: { id: roleId },
      });

      if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);

      // Delete the specific role permission
      await manager.delete(RolePermission, {
        idRole: roleId,
        idPermission: permissionId,
      });

      // Return updated role with permissions
      const updatedRole = await manager.findOne(Role, {
        where: { id: roleId },
        relations: ['rolePermissions', 'rolePermissions.permission'],
      });

      if (!updatedRole) throw new NotFoundException(`Role with ID ${roleId} not found after permission removal`);

      return updatedRole;
    });
  }

  async getRolePermissions(roleId: number): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);

    return role;
  }
}
