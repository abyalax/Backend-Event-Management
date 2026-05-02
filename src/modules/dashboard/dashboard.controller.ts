import { Controller, Get, HttpCode, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { PERMISSIONS } from '~/common/constants/permissions';
import { Permissions } from '~/common/decorators/permissions.decorator';
import { JwtGuard } from '~/common/guards/jwt.guard';
import { PermissionsGuard } from '~/common/guards/permission.guard';
import { TResponse } from '~/common/types/response';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { DashboardCacheService } from './dashboard-cache.service';

@UseGuards(JwtGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardCacheService: DashboardCacheService) {}

  @Permissions(PERMISSIONS.DASHBOARD.TOTAL_SALES)
  @HttpCode(HttpStatus.OK)
  @Get('/total-sales')
  async totalSales(@Query() query: QueryDashboardDto): Promise<TResponse> {
    const data = await this.dashboardCacheService.totalSales(query);

    return {
      message: 'get total sales successfully',
      data,
    };
  }

  @Permissions(PERMISSIONS.DASHBOARD.TOP_EVENTS)
  @HttpCode(HttpStatus.OK)
  @Get('/top-events')
  async topEvents(@Query() query: QueryDashboardDto): Promise<TResponse> {
    // Use raw query parameters for validation since DTO might be empty if validation fails
    const data = await this.dashboardCacheService.topEvents(query);

    return {
      message: 'get top events successfully',
      data,
    };
  }

  @Permissions(PERMISSIONS.DASHBOARD.TOP_CATEGORIES)
  @HttpCode(HttpStatus.OK)
  @Get('/top-categories')
  async topCategories(@Query() query: QueryDashboardDto): Promise<TResponse> {
    const data = await this.dashboardCacheService.topCategories(query);

    return {
      message: 'get top categories successfully',
      data,
    };
  }
}
