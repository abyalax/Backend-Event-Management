import { Injectable, Logger } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { OrderService } from '../order.service';
import { ORDER_STATUS_TRANSITIONS, OrderStatus } from '~/common/constants/order-status.enum';

export interface OrderProcessJobData {
  orderId: string;
  action: 'validate_payment' | 'expire_order' | 'generate_tickets';
}

@Injectable()
export class OrderProcessorWorker {
  private readonly logger = new Logger(OrderProcessorWorker.name);
  private worker: Worker<OrderProcessJobData>;

  constructor(private readonly orderService: OrderService) {
    this.worker = new Worker<OrderProcessJobData>(
      'order-queue',
      async (job: Job<OrderProcessJobData>) => {
        await this.processOrderJob(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Completed job ${job.id} for order ${job.data.orderId}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Failed job ${job?.id} for order ${job?.data?.orderId}:`, err);
    });
  }

  private async processOrderJob(job: Job<OrderProcessJobData>): Promise<void> {
    const { orderId, action } = job.data;
    this.logger.log(`Processing ${action} for order ${orderId}`);

    try {
      switch (action) {
        case 'validate_payment':
          await this.validatePayment(orderId);
          break;
        case 'expire_order':
          await this.expireOrder(orderId);
          break;
        case 'generate_tickets':
          await this.generateTickets(orderId);
          break;
        default:
          this.logger.warn(`Unknown action: ${action}`);
      }
    } catch (error) {
      this.logger.error(`Error processing ${action} for order ${orderId}:`, error);
      throw error;
    }
  }

  private async validatePayment(orderId: string): Promise<void> {
    this.logger.log(`Validating payment for order ${orderId}`);

    const order = await this.orderService.findOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(`Order ${orderId} is not in PENDING status, current status: ${order.status}`);
      return;
    }

    // Check if payment is actually paid by calling Xendit API
    // This is a safety check to ensure webhook was legitimate
    const payment = await this.orderService.getPaymentByOrderId(orderId);
    if (payment && payment.status === 'PAID') {
      await this.orderService.updateOrderStatus(orderId, OrderStatus.PAID);
      await this.generateTickets(orderId);
      this.logger.log(`Payment validated and order ${orderId} marked as PAID`);
    } else {
      this.logger.warn(`Payment validation failed for order ${orderId}`);
    }
  }

  private async expireOrder(orderId: string): Promise<void> {
    this.logger.log(`Expiring order ${orderId}`);

    const order = await this.orderService.findOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(`Order ${orderId} is not in PENDING status, current status: ${order.status}`);
      return;
    }

    // Update order status to EXPIRED
    await this.orderService.updateOrderStatus(orderId, OrderStatus.EXPIRED);
    
    // Release locked ticket quotas
    await this.orderService.releaseTicketQuotas(orderId);
    
    this.logger.log(`Order ${orderId} expired and ticket quotas released`);
  }

  private async generateTickets(orderId: string): Promise<void> {
    this.logger.log(`Generating tickets for order ${orderId}`);

    const order = await this.orderService.findOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PAID) {
      throw new Error(`Order ${orderId} is not in PAID status, current status: ${order.status}`);
    }

    // Generate individual tickets for each order item
    await this.orderService.generateTicketsForOrder(orderId);
    
    this.logger.log(`Tickets generated for order ${orderId}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing order processor worker');
    await this.worker.close();
  }
}
