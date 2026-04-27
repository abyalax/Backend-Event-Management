import { Expose, Type } from 'class-transformer';
import { OrderStatus } from '~/common/constants/order-status.enum';

export class GeneratedTicketResponseDto {
  @Expose()
  id: string;

  @Expose()
  qrCodeUrl: string;

  @Expose()
  pdfUrl: string;

  @Expose()
  isUsed: boolean;

  @Expose()
  issuedAt: Date;
}

export class OrderItemResponseDto {
  @Expose()
  id: string;

  @Expose()
  ticketId: string;

  @Expose()
  ticketName?: string;

  @Expose()
  quantity: number;

  @Expose()
  price: number;

  @Expose()
  subtotal: number;

  @Expose()
  @Type(() => GeneratedTicketResponseDto)
  generatedTickets?: GeneratedTicketResponseDto[];
}

export class OrderPaymentResponseDto {
  @Expose()
  id: string;

  @Expose()
  externalId: string;

  @Expose()
  status: string;

  @Expose()
  amount: number;

  @Expose()
  paymentMethod: string;

  @Expose()
  paymentUrl?: string | null;

  @Expose()
  paidAt?: Date | null;

  @Expose()
  expiresAt?: Date | null;
}

export class OrderResponseDto {
  @Expose()
  id: string;

  @Expose()
  userId: string;

  @Expose()
  totalAmount: number;

  @Expose()
  status: OrderStatus;

  @Expose()
  expiredAt?: Date | null;

  @Expose()
  createdAt?: string;

  @Expose()
  updatedAt?: string;

  @Expose()
  @Type(() => OrderItemResponseDto)
  items: OrderItemResponseDto[];

  @Expose()
  @Type(() => OrderPaymentResponseDto)
  payment?: OrderPaymentResponseDto | null;
}
