import { Injectable } from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { plainToInstance } from 'class-transformer';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueryRolePermissionDto } from './dto/query-role-permission.dto';
import { RoleService } from './role-permission.service';
import { Role } from './entity/role.entity';
import { CreateRoleDto } from './dto/create-role-permission.dto';
import { UpdateRoleDto } from './dto/update-role-permission.dto';
import { RoleDto } from './dto/role-permission.dto';

@Injectable()
export class RoleCacheService {
  private readonly KEY_PREFIX = 'roles';
  private readonly TTL_BY_ID = 600; // 10 minutes

  constructor(
    private readonly cache: CacheService,
    private readonly roleService: RoleService,
  ) {}

  private keyById(id: number): string {
    return `${this.KEY_PREFIX}:by-id:${id}`;
  }

  private keyList(query: QueryRolePermissionDto): string {
    const searchKey = query.search ? `:search:${query.search}` : '';
    const sortKey = query.sort_by && query.sort_order ? `:sort:${query.sort_by}:${query.sort_order}` : '';
    return `${this.KEY_PREFIX}:list:page:${query.page}:limit:${query.limit}${searchKey}${sortKey}`;
  }

  async getById(id: number): Promise<RoleDto | null> {
    const role = await this.cache.getOrSet(
      this.keyById(id),
      () =>
        this.roleService.findOne({
          where: { id },
          relations: ['rolePermissions'],
        }),
      this.TTL_BY_ID,
    );

    if (!role) return null;

    // Transform role with manual permission mapping
    const roleDto = plainToInstance(RoleDto, role, {
      excludeExtraneousValues: true,
    });

    // Manually set permissions for the role
    if (role?.rolePermissions) {
      roleDto.permissions = role.rolePermissions.map((rp) => rp.permission);
    }

    return roleDto;
  }

  async getList(query: QueryRolePermissionDto) {
    const sortBy: [string, string][] = query.sort_by && query.sort_order ? [[query.sort_by, query.sort_order]] : [['updatedAt', 'DESC']];
    const mappedQuery: PaginateQuery = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy,
      path: '',
    };
    return this.cache.getOrSet(
      this.keyList(mappedQuery),
      () => this.roleService.list(mappedQuery),
      300, // 5 minutes
    );
  }

  async create(createRoleDto: CreateRoleDto) {
    const role = await this.roleService.create(createRoleDto);
    await this.invalidateList();
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleService.update(id, updateRoleDto);
    await this.invalidateOnMutation(id);
    return role;
  }

  async delete(id: number) {
    const removed = await this.roleService.remove(id);
    await this.invalidateOnMutation(id);
    return removed;
  }

  async invalidateById(id: number): Promise<void> {
    await this.cache.clear(this.keyById(id));
  }

  async invalidateList(): Promise<void> {
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:list:*`);
  }

  async invalidateOnMutation(roleId?: number): Promise<void> {
    if (roleId) await this.invalidateById(roleId);
    await this.invalidateList();
  }

  async assignPermissions(roleId: number, permissionIds: number[]): Promise<Role> {
    const role = await this.roleService.assignPermissions(roleId, permissionIds);
    await this.invalidateOnMutation(roleId);
    return role;
  }

  async removePermission(roleId: number, permissionId: number): Promise<Role> {
    const role = await this.roleService.removePermission(roleId, permissionId);
    await this.invalidateOnMutation(roleId);
    return role;
  }

  async getRolePermissions(roleId: number): Promise<Role> {
    return this.cache.getOrSet(`${this.KEY_PREFIX}:permissions:${roleId}`, () => this.roleService.getRolePermissions(roleId), this.TTL_BY_ID);
  }
}
