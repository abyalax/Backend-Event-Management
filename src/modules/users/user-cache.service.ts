import { Injectable } from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueryUserDto } from './dto/query-user.dto';
import { User } from './entity/user.entity';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserCacheService {
  private readonly KEY_PREFIX = 'user';
  private readonly TTL_BY_ID = 600; // 10 minutes

  constructor(
    private readonly cache: CacheService,
    private readonly userService: UserService,
  ) {}

  private keyById(id: string): string {
    return `${this.KEY_PREFIX}:by-id:${id}`;
  }

  private keyList(query: QueryUserDto): string {
    const searchKey = query.search ? `:search:${query.search}` : '';
    const sortKey = query.sort_by && query.sort_order ? `:sort:${query.sort_by}:${query.sort_order}` : '';
    return `${this.KEY_PREFIX}:list:page:${query.page}:limit:${query.limit}${searchKey}${sortKey}`;
  }

  async getById(id: string): Promise<User | null> {
    return this.cache.getOrSet(
      this.keyById(id),
      () =>
        this.userService.findOne({
          where: { id },
        }),
      this.TTL_BY_ID,
    );
  }

  async getList(query: QueryUserDto) {
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
      () => this.userService.list(mappedQuery),
      300, // 5 minutes
    );
  }

  async create(createUserDto: CreateUserDto) {
    const user = await this.userService.create(createUserDto);
    await this.invalidateList();
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userService.update(id, updateUserDto);
    await this.invalidateOnMutation(id);
    return user;
  }

  async delete(id: string) {
    const removed = await this.userService.remove(id);
    await this.invalidateOnMutation(id);
    return removed;
  }

  async invalidateById(id: string): Promise<void> {
    await this.cache.clear(this.keyById(id));
  }

  async invalidateList(): Promise<void> {
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:list:*`);
  }

  async invalidateOnMutation(userId?: string): Promise<void> {
    if (userId) await this.invalidateById(userId);
    await this.invalidateList();
  }

  async assignRoles(userId: string, roleIds: number[]): Promise<User> {
    const user = await this.userService.assignRoles(userId, roleIds);
    // Invalidate all user-related caches
    await this.invalidateById(userId);
    await this.invalidateList();
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:roles:${userId}`);
    return user;
  }

  async removeRole(userId: string, roleId: number): Promise<User> {
    const user = await this.userService.removeRole(userId, roleId);
    await this.invalidateOnMutation(userId);
    return user;
  }

  async getUserRoles(userId: string): Promise<User> {
    return this.cache.getOrSet(`${this.KEY_PREFIX}:roles:${userId}`, () => this.userService.getUserRoles(userId), this.TTL_BY_ID);
  }
}
