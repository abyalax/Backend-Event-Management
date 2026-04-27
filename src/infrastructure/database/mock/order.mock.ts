import type { Order } from "~/modules/orders/entity/order.entity";
import { OrderStatus } from "~/common/constants/order-status.enum";

export const mockOrders = (): Partial<Order>[] => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return [
    {
      id: "550e8400-e29b-41d4-a716-446655440200",
      userId: "550e8400-e29b-41d4-a716-446655440001", // Customer
      totalAmount: 150000,
      status: OrderStatus.PENDING,
      expiredAt: tomorrow,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440201",
      userId: "550e8400-e29b-41d4-a716-446655440001", // Customer
      totalAmount: 500000,
      status: OrderStatus.PAID,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440202",
      userId: "550e8400-e29b-41d4-a716-446655440001", // Customer
      totalAmount: 250000,
      status: OrderStatus.CANCELLED,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440203",
      userId: "550e8400-e29b-41d4-a716-446655440001", // Customer
      totalAmount: 100000,
      status: OrderStatus.PENDING,
      expiredAt: tomorrow,
    },
  ];
};
