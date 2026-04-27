import { Injectable, Inject } from '@nestjs/common';
import { Worker, Job } from 'bullmq';
import { OrderService } from '../order.service';
import { OrderStatus } from '~/common/constants/order-status.enum';
import { PinoLogger } from 'nestjs-pino';
import { CONFIG_SERVICE, ConfigService } from '~/infrastructure/config/config.provider';

export interface OrderProcessJobData {
  orderId: string;
  action: 'validate_payment' | 'expire_order' | 'generate_tickets';
}

@Injectable()
export class OrderProcessorWorker {
  private readonly worker: Worker<OrderProcessJobData>;

  constructor(
    private readonly orderService: OrderService,
    private readonly logger: PinoLogger,
    @Inject(CONFIG_SERVICE)
    private readonly config: ConfigService,
  ) {
    this.logger.setContext(OrderProcessorWorker.name);
    this.worker = new Worker<OrderProcessJobData>(
      'order-queue',
      async (job: Job<OrderProcessJobData>) => {
        await this.processOrderJob(job);
      },
      {
        connection: {
          host: this.config.get('REDIS_HOST'),
          port: this.config.get('REDIS_PORT'),
          password: this.config.get('REDIS_PASSWORD'),
        },
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.info(`Completed job ${job.id} for order ${job.data.orderId}`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Failed job ${job?.id} for order ${job?.data?.orderId}:`, err);
    });
  }

  private async processOrderJob(job: Job<OrderProcessJobData>): Promise<void> {
    const { orderId, action } = job.data;
    this.logger.info(`Processing ${action} for order ${orderId}`);

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
    this.logger.info(`Validating payment for order ${orderId}`);

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
      this.logger.info(`Payment validated and order ${orderId} marked as PAID`);
    } else {
      this.logger.warn(`Payment validation failed for order ${orderId}`);
    }
  }

  private async expireOrder(orderId: string): Promise<void> {
    this.logger.info(`Expiring order ${orderId}`);

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

    this.logger.info(`Order ${orderId} expired and ticket quotas released`);
  }

  private async generateTickets(orderId: string): Promise<void> {
    this.logger.info(`Generating tickets for order ${orderId}`);

    const order = await this.orderService.findOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PAID) {
      throw new Error(`Order ${orderId} is not in PAID status, current status: ${order.status}`);
    }

    // Generate individual tickets for each order item
    await this.orderService.generateTicketsForOrder(orderId);

    this.logger.info(`Tickets generated for order ${orderId}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.info('Closing order processor worker');
    await this.worker.close();
  }
}
