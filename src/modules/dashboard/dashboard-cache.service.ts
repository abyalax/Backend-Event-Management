import { Injectable, BadRequestException } from '@nestjs/common';
import { CacheService } from '~/infrastructure/cache/cache.service';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { DashboardService } from './dashboard.service';

@Injectable()
export class DashboardCacheService {
  private readonly KEY_PREFIX = 'dashboard';
  private readonly TTL_BY_ID = 600; // 10 minutes

  constructor(
    private readonly cache: CacheService,
    private readonly dashboardService: DashboardService,
  ) {}

  private keyTotalSales(query: QueryDashboardDto): string {
    const startDate = query.startDate || '';
    const endDate = query.endDate || '';
    return `${this.KEY_PREFIX}:total-sales:${startDate}:${endDate}`;
  }

  private keyTopEvents(query: QueryDashboardDto): string {
    const startDate = query.startDate || '';
    const endDate = query.endDate || '';
    return `${this.KEY_PREFIX}:top-events:${startDate}:${endDate}`;
  }

  private keyTopCategories(query: QueryDashboardDto): string {
    const startDate = query.startDate || '';
    const endDate = query.endDate || '';
    return `${this.KEY_PREFIX}:top-categories:${startDate}:${endDate}`;
  }

  private validateDateParameters(query: QueryDashboardDto): void {
    // Validate startDate
    if (query.startDate) {
      const startDate = new Date(query.startDate);
      if (Number.isNaN(startDate.getTime())) throw new BadRequestException('Invalid startDate format');
    }

    // Validate endDate
    if (query.endDate) {
      const endDate = new Date(query.endDate);
      if (Number.isNaN(endDate.getTime())) throw new BadRequestException('Invalid endDate format');
    }

    // Validate date range
    if (query.startDate && query.endDate) {
      const startDate = new Date(query.startDate);
      const endDate = new Date(query.endDate);
      if (startDate > endDate) throw new BadRequestException('Start date cannot be after end date');
    }

    // Validate dateRange
    if (query.dateRange) {
      if (query.dateRange.start) {
        const start = new Date(query.dateRange.start);
        if (Number.isNaN(start.getTime())) throw new BadRequestException('Invalid dateRange.start format');
      }
      if (query.dateRange.end) {
        const end = new Date(query.dateRange.end);
        if (Number.isNaN(end.getTime())) throw new BadRequestException('Invalid dateRange.end format');
      }
      if (query.dateRange.start && query.dateRange.end) {
        const start = new Date(query.dateRange.start);
        const end = new Date(query.dateRange.end);
        if (start > end) throw new BadRequestException('Start date cannot be after end date');
      }
    }

    // Validate single date
    if (query.date) {
      const singleDate = new Date(query.date);
      if (Number.isNaN(singleDate.getTime())) throw new BadRequestException('Invalid date format');
    }
  }

  async totalSales(query: QueryDashboardDto) {
    this.validateDateParameters(query);
    return this.cache.getOrSet(
      this.keyTotalSales(query),
      () => this.dashboardService.totalSales(query),
      300, // 5 minutes
    );
  }

  async topEvents(query: QueryDashboardDto) {
    this.validateDateParameters(query);
    return this.cache.getOrSet(
      this.keyTopEvents(query),
      () => this.dashboardService.topEvents(query),
      300, // 5 minutes
    );
  }

  async topCategories(query: QueryDashboardDto) {
    this.validateDateParameters(query);
    return this.cache.getOrSet(
      this.keyTopCategories(query),
      () => this.dashboardService.topCategories(query),
      300, // 5 minutes
    );
  }

  async invalidate(): Promise<void> {
    await this.cache.clearByPattern(`${this.KEY_PREFIX}:*`);
  }
}
