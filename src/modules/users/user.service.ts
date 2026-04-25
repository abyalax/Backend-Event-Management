import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPOSITORY } from '~/common/constants/database';
import { Permission } from '../auth/entity/permission.entity';
import { Role } from '../role-permissions/entity/role.entity';
import { User } from './entity/user.entity';

import { paginate, PaginateQuery } from 'nestjs-paginate';
import type { FindOneOptions, Repository } from 'typeorm';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import { USER_PAGINATION_CONFIG } from './user-pagination.config';
import { plainToInstance } from 'class-transformer';
import { UserDto } from './dto/user.dto';
import { RolePermission } from '../role-permissions/entity/role-permissions.entity';

@Injectable()
export class UserService {
  constructor(
    @Inject(REPOSITORY.USER)
    private readonly userRepository: Repository<User>,

    @Inject(REPOSITORY.PERMISSION)
    private readonly permissionRepository: Repository<Permission>,
  ) {}

  async list(query: PaginateQuery) {
    const paginatedUsers = await paginate(query, this.userRepository, USER_PAGINATION_CONFIG);

    const users = plainToInstance(UserDto, paginatedUsers.data, {
      excludeExtraneousValues: true,
    });

    // Manually set permissions for each user's roles
    users.forEach((user) => {
      const originalUser = paginatedUsers.data.find((u) => u.id === user.id);
      if (originalUser?.roles) {
        user.roles.forEach((role) => {
          const originalRole = originalUser.roles.find((r) => r.id === role.id);
          if (originalRole?.rolePermissions) {
            role.permissions = originalRole.rolePermissions.map((rp: RolePermission) => rp.permission);
          }
        });
      }
    });

    return {
      meta: paginatedUsers.meta,
      links: paginatedUsers.links,
      data: users,
    };
  }

  async getRefreshToken(userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });
    return user?.refreshToken;
  }

  async getFullPermissions(userId: string) {
    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .distinct(true)
      .innerJoin('permission.rolePermissions', 'rolePermission')
      .innerJoin('rolePermission.role', 'role')
      .innerJoin('role.users', 'user')
      .where('user.id = :userId', { userId })
      .getMany();
    return permissions;
  }

  async saveRefreshToken(userId: string, refreshToken: string) {
    return await this.userRepository.update(userId, { refreshToken });
  }

  async removeRefreshToken(userId: string) {
    return await this.userRepository.update(userId, { refreshToken: null });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });
  }

  async findOne(params: FindOneOptions<User>) {
    return await this.userRepository.findOne({
      ...params,
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.preload({
      id: id,
      ...updateUserDto,
    });

    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return await this.userRepository.save(user);
  }

  async remove(id: string) {
    return await this.userRepository.softDelete(id);
  }

  async assignRoles(userId: string, roleIds: number[]): Promise<User> {
    return await this.userRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
        relations: ['roles'],
      });

      if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

      // Get the roles to assign
      const roles = await manager.find(Role, { where: roleIds.map((id) => ({ id })) });
      if (roles.length === 0) throw new NotFoundException('No valid roles found');

      // Clear existing roles and set new ones
      user.roles = roles;
      // Save the user with new roles
      await manager.save(user);

      // Return updated user with roles and permissions
      const updatedUser = await manager.findOne(User, {
        where: { id: userId },
        relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
      });

      if (!updatedUser) throw new NotFoundException(`User with ID ${userId} not found after role assignment`);

      return updatedUser;
    });
  }

  async removeRole(userId: string, roleId: number): Promise<User> {
    return await this.userRepository.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

      const role = await manager.findOne(Role, {
        where: { id: roleId },
      });

      if (!role) throw new NotFoundException(`Role with ID ${roleId} not found`);

      // Remove the specific role from user
      await manager.createQueryBuilder().relation(User, 'roles').of(user).remove(role);

      // Return updated user with roles and permissions
      const updatedUser = await manager.findOne(User, {
        where: { id: userId },
        relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
      });

      if (!updatedUser) throw new NotFoundException(`User with ID ${userId} not found after role removal`);

      return updatedUser;
    });
  }

  async getUserRoles(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.rolePermissions', 'roles.rolePermissions.permission'],
    });

    if (!user) throw new NotFoundException(`User with ID ${userId} not found`);

    return user;
  }
}
