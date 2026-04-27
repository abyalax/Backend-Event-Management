import { Expose } from 'class-transformer';
import { OrderStatus } from '~/common/constants/order-status.enum';

export class OrderStatusResponseDto {
  @Expose()
  orderId: string;

  @Expose()
  status: OrderStatus;

  @Expose()
  paymentStatus?: string | null;

  @Expose()
  paymentUrl?: string | null;

  @Expose()
  expiredAt?: Date | null;
}
