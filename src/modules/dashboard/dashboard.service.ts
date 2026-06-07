import { Inject, Injectable } from '@nestjs/common';
import { REPOSITORY } from '~/common/constants/database';
import type { Repository } from 'typeorm';
import { QueryDashboardDto } from './dto/query-dashboard.dto';
import { Payment } from '../payments/entities/payment.entity';
import { TopEvents, TotalSales } from './dashboard.interface';
import { PaymentStatus } from '../payments/payment.enum';

@Injectable()
export class DashboardService {
  constructor(
    @Inject(REPOSITORY.PAYMENT)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  /**
   * Process multiple date parameter formats and return standardized startDate and endDate
   * Supports:
   * - startDate & endDate parameters
   * - dateRange.start & dateRange.end parameters
   * - date parameter (single date)
   */
  private processDateParameters(query: QueryDashboardDto): { startDate?: Date; endDate?: Date } {
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    // Priority 1: Direct startDate/endDate parameters
    if (query.startDate) startDate = new Date(query.startDate);
    if (query.endDate) endDate = new Date(query.endDate);

    // Priority 2: dateRange object parameters
    if (query.dateRange) {
      if (query.dateRange.start && !startDate) {
        startDate = new Date(query.dateRange.start);
      }
      if (query.dateRange.end && !endDate) {
        endDate = new Date(query.dateRange.end);
      }
    }

    // Priority 3: Single date parameter (use as both start and end)
    if (query.date && !startDate && !endDate) {
      const singleDate = new Date(query.date);
      startDate = singleDate;
      endDate = singleDate;
    }

    return { startDate, endDate };
  }

  async totalSales(query: QueryDashboardDto) {
    const { startDate, endDate } = this.processDateParameters(query);

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'totalSales')
      .addSelect('COUNT(DISTINCT payment.orderId)', 'totalOrders')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED });

    if (startDate) queryBuilder.andWhere('payment.paidAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('payment.paidAt <= :endDate', { endDate });

    const result = await queryBuilder.getRawOne<TotalSales>();
    return result;
  }

  async topEvents(query: QueryDashboardDto, limit: number = 10) {
    const { startDate, endDate } = this.processDateParameters(query);

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .select(['event.id', 'event.title', 'SUM(payment.amount) as totalSales', 'COUNT(DISTINCT payment.orderId) as totalOrders'])
      .leftJoin('payment.order', 'order')
      .leftJoin('order.orderItems', 'orderItem')
      .leftJoin('orderItem.ticket', 'ticket')
      .leftJoin('ticket.event', 'event')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('event.id, event.title')
      .orderBy('totalSales', 'DESC')
      .limit(limit);

    if (startDate) queryBuilder.andWhere('payment.paidAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('payment.paidAt <= :endDate', { endDate });

    const result = await queryBuilder.getRawMany<TopEvents>();
    return result;
  }

  async topCategories(query: QueryDashboardDto, limit: number = 10) {
    const { startDate, endDate } = this.processDateParameters(query);

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .select(['category.id', 'category.name', 'SUM(payment.amount) as totalSales', 'COUNT(DISTINCT payment.orderId) as totalOrders'])
      .leftJoin('payment.order', 'order')
      .leftJoin('order.orderItems', 'orderItem')
      .leftJoin('orderItem.ticket', 'ticket')
      .leftJoin('ticket.event', 'event')
      .leftJoin('event.category', 'category')
      .where('payment.status = :status', { status: PaymentStatus.COMPLETED })
      .groupBy('category.id, category.name')
      .orderBy('totalSales', 'DESC')
      .limit(limit);

    if (startDate) queryBuilder.andWhere('payment.paidAt >= :startDate', { startDate });
    if (endDate) queryBuilder.andWhere('payment.paidAt <= :endDate', { endDate });

    const result = await queryBuilder.getRawMany();
    return result;
  }
}
