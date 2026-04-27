export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.EXPIRED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [], // Final state
  [OrderStatus.EXPIRED]: [], // Final state
  [OrderStatus.CANCELLED]: [], // Final state
};

export const ORDER_TTL_MINUTES = 15;
