import { Order } from "../models/Order";
import { IOrdersRepository } from "../repositories/orders-repository";

export interface IOrderService {
  getOrderById(orderId: string): Promise<Order | null>;
  getOrders(): Promise<Order[]>;
  createOrder(order: Omit<Order, "orderId">): Promise<Order>;
  deleteOrder(orderId: string): Promise<void>;
  updateOrder(order: Order): Promise<Order>;
}

export interface IOrdersServiceProps {
  ordersRepository: IOrdersRepository;
}

export class OrdersService implements IOrderService {
  ordersRepository: IOrdersRepository;

  constructor(props: IOrdersServiceProps) {
    this.ordersRepository = props.ordersRepository;
  }

  /**
   * Gets order by id
   * @param orderId
   */
  public async getOrderById(orderId: string): Promise<Order | null> {
    const result = await this.ordersRepository.getOrderById(orderId);

    return result;
  }

  /**
   * Gets all orders
   */
  public async getOrders(): Promise<Order[]> {
    const result = await this.ordersRepository.getOrders();

    return result;
  }

  /**
   * Creates a new order
   * @param order
   */
  public async createOrder(order: Omit<Order, "orderId">): Promise<Order> {
    const result = await this.ordersRepository.createOrder(order);

    return result;
  }

  /**
   * Deletes an existing order
   * @param orderId
   */
  public async deleteOrder(orderId: string): Promise<void> {
    await this.ordersRepository.deleteOrder(orderId);
  }

  /**
   * Updates an order
   * @param order
   */
  public async updateOrder(order: Order): Promise<Order> {
    const result = await this.ordersRepository.updateOrder(order);

    return result;
  }
}
