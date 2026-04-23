import { Injectable } from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueryRoleDto } from './dto/query-role.dto';
import { RoleService } from './role.service';
import { Role } from './entity/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

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

  private keyList(query: QueryRoleDto): string {
    const searchKey = query.search ? `:search:${query.search}` : '';
    const sortKey = query.sort_by && query.sort_order ? `:sort:${query.sort_by}:${query.sort_order}` : '';
    return `${this.KEY_PREFIX}:list:page:${query.page}:limit:${query.limit}${searchKey}${sortKey}`;
  }

  async getById(id: number): Promise<Role | null> {
    return this.cache.getOrSet(
      this.keyById(id),
      () =>
        this.roleService.findOne({
          where: { id },
          relations: ['permissions'],
        }),
      this.TTL_BY_ID,
    );
  }

  async getList(query: QueryRoleDto) {
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

  async create(createUserDto: CreateRoleDto) {
    const user = await this.roleService.create(createUserDto);
    await this.invalidateList();
    return user;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const user = await this.roleService.update(id, updateRoleDto);
    await this.invalidateOnMutation(id);
    return user;
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

  async invalidateOnMutation(userId?: number): Promise<void> {
    if (userId) await this.invalidateById(userId);
    await this.invalidateList();
  }
}
