export type OrderStatus =
  | "NEW"
  | "PROCESSING"
  | "PAID"
  | "SHIPPED"
  | "DELIVERED";

export type Order = {
  orderId: string;
  customerId: string;
  dateTimePlaced: string;
  status: OrderStatus;
};
