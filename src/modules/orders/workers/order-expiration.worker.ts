import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderService } from '../order.service';
import { OrderStatus, ORDER_TTL_MINUTES } from '~/common/constants/order-status.enum';

@Injectable()
export class OrderExpirationWorker {
  private readonly logger = new Logger(OrderExpirationWorker.name);

  constructor(private readonly orderService: OrderService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredOrders(): Promise<void> {
    this.logger.log('Checking for expired orders...');

    try {
      const expiredOrders = await this.orderService.findExpiredPendingOrders();
      
      if (expiredOrders.length === 0) {
        this.logger.log('No expired orders found');
        return;
      }

      this.logger.log(`Found ${expiredOrders.length} expired orders to process`);

      for (const order of expiredOrders) {
        await this.processExpiredOrder(order.id);
      }

      this.logger.log(`Processed ${expiredOrders.length} expired orders`);
    } catch (error) {
      this.logger.error('Error checking expired orders:', error);
    }
  }

  private async processExpiredOrder(orderId: string): Promise<void> {
    this.logger.log(`Processing expired order: ${orderId}`);

    try {
      // Update order status to EXPIRED
      await this.orderService.updateOrderStatus(orderId, OrderStatus.EXPIRED);
      
      // Release locked ticket quotas
      await this.orderService.releaseTicketQuotas(orderId);
      
      this.logger.log(`Successfully processed expired order: ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to process expired order ${orderId}:`, error);
    }
  }

  async checkOrderExpiration(orderId: string): Promise<boolean> {
    try {
      const order = await this.orderService.findOrderById(orderId);
      
      if (!order) {
        this.logger.warn(`Order ${orderId} not found`);
        return false;
      }

      if (order.status !== OrderStatus.PENDING) {
        return false;
      }

      // Check if order has expired
      if (!order.createdAt) {
        this.logger.warn(`Order ${orderId} is missing createdAt timestamp`);
        return false;
      }

      const expirationTime = new Date(order.createdAt);
      expirationTime.setMinutes(expirationTime.getMinutes() + ORDER_TTL_MINUTES);
      
      const isExpired = new Date() > expirationTime;
      
      if (isExpired) {
        await this.processExpiredOrder(orderId);
        this.logger.log(`Order ${orderId} has been expired and processed`);
      }

      return isExpired;
    } catch (error) {
      this.logger.error(`Error checking expiration for order ${orderId}:`, error);
      return false;
    }
  }

  async getOrderExpirationTime(orderId: string): Promise<Date | null> {
    try {
      const order = await this.orderService.findOrderById(orderId);
      
      if (!order || order.status !== OrderStatus.PENDING) {
        return null;
      }

      if (!order.createdAt) {
        return null;
      }

      const expirationTime = new Date(order.createdAt);
      expirationTime.setMinutes(expirationTime.getMinutes() + ORDER_TTL_MINUTES);
      
      return expirationTime;
    } catch (error) {
      this.logger.error(`Error getting expiration time for order ${orderId}:`, error);
      return null;
    }
  }

  async extendOrderExpiration(orderId: string, additionalMinutes: number = ORDER_TTL_MINUTES): Promise<boolean> {
    try {
      const order = await this.orderService.findOrderById(orderId);
      
      if (!order || order.status !== OrderStatus.PENDING) {
        this.logger.warn(`Cannot extend expiration for order ${orderId}: not found or not pending`);
        return false;
      }

      // Update the expiration timestamp in the database
      const newExpirationTime = new Date();
      newExpirationTime.setMinutes(newExpirationTime.getMinutes() + additionalMinutes);
      
      await this.orderService.updateOrderExpiration(orderId, newExpirationTime);
      
      this.logger.log(`Extended expiration for order ${orderId} by ${additionalMinutes} minutes`);
      return true;
    } catch (error) {
      this.logger.error(`Error extending expiration for order ${orderId}:`, error);
      return false;
    }
  }
}
