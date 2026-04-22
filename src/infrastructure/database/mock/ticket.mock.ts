import type { Ticket } from "~/modules/tickets/entity/ticket.entity";

export const mockTickets = (): Partial<Ticket>[] => {
  return [
    {
      id: "550e8400-e29b-41d4-a716-446655440100",
      eventId: "550e8400-e29b-41d4-a716-446655440100",
      name: "Early Bird Ticket",
      price: 150000,
      quota: 100,
      sold: 25,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440101",
      eventId: "550e8400-e29b-41d4-a716-446655440100",
      name: "Regular Ticket",
      price: 250000,
      quota: 200,
      sold: 50,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440102",
      eventId: "550e8400-e29b-41d4-a716-446655440101",
      name: "VIP Ticket",
      price: 500000,
      quota: 50,
      sold: 10,
    },
    {
      id: "550e8400-e29b-41d4-a716-446655440103",
      eventId: "550e8400-e29b-41d4-a716-446655440101",
      name: "Standard Access",
      price: 100000,
      quota: 150,
      sold: 30,
    },
  ];
};