import { Injectable } from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueryUserDto } from './dto/query-user.dto';
import { User } from './entity/user.entity';
import { UserService } from './user.service';

@Injectable()
export class UserCacheService {
  private readonly KEY_PREFIX = 'user';
  private readonly TTL_BY_ID = 600; // 10 minutes

  constructor(
    private readonly cache: CacheService,
    private readonly userService: UserService,
  ) {}

  /**
   * Generate cache key for user by ID
   */
  private keyById(id: string): string {
    return `${this.KEY_PREFIX}:by-id:${id}`;
  }

  /**
   * Generate cache key for user list
   */
  private keyList(query: QueryUserDto): string {
    const searchKey = query.search ? `:search:${query.search}` : '';
    const sortKey = query.sort_by && query.sort_order ? `:sort:${query.sort_by}:${query.sort_order}` : '';
    return `${this.KEY_PREFIX}:list:page:${query.page}:limit:${query.limit}${searchKey}${sortKey}`;
  }

  /**
   * Get user by ID with cache
   * Uses distributed lock to prevent cache stampede
   */
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

  /**
   * Get user list with pagination and cache
   */
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

  /**
   * Invalidate user cache by ID
   */
  async invalidateById(id: string): Promise<void> {
    await this.cache.clear(this.keyById(id));
  }

  /**
   * Invalidate all user list caches
   */
  async invalidateList(): Promise<void> {
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:list:*`);
  }

  /**
   * Invalidate all user caches (both by-id and list)
   */
  async invalidateAll(): Promise<void> {
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:*`);
  }

  /**
   * Invalidate user and related caches
   * Call this after create/update/delete operations
   */
  async invalidateOnMutation(userId?: string): Promise<void> {
    if (userId) await this.invalidateById(userId);

    await this.invalidateList();
  }
}
