import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { Order } from "../models/Order";
import { unmarshall, marshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";

export interface IOrdersRepository {
  getOrderById(orderId: string): Promise<Order | null>;
  getOrders(): Promise<Order[]>;
  createOrder(order: Omit<Order, "orderId">): Promise<Order>;
  deleteOrder(orderId: string): Promise<void>;
  updateOrder(order: Order): Promise<Order>;
}

export interface IOrdersRepositoryProps {
  ddbClient: DynamoDBClient;
}

export class OrdersRepository implements IOrdersRepository {
  private ddbClient: DynamoDBClient;
  private ordersTableName: string;

  constructor(props: IOrdersRepositoryProps) {
    this.ddbClient = props.ddbClient;
    this.ordersTableName = process.env.TABLE_NAME_ORDERS!;
  }

  private translate(record: Partial<Order>): Order {
    return {
      orderId: record.orderId || this.generatePK(),
      customerId: record.customerId || "N/A",
      status: "NEW",
      dateTimePlaced: record.dateTimePlaced || new Date().toISOString(),
    };
  }

  private generatePK(): string {
    return uuidv4();
  }

  public async getOrderById(orderId: string): Promise<Order | null> {
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.ordersTableName,
        Key: marshall({
          orderId,
        }),
      })
    );

    return result.Item ? this.translate(unmarshall(result.Item)) : null;
  }

  public async getOrders(): Promise<Order[]> {
    // NOTE: the below implementation does not use proper pagination and is for demo purposes only.
    const result = await this.ddbClient.send(
      new ScanCommand({
        TableName: this.ordersTableName,
      })
    );

    return result.Items?.map((item) => this.translate(unmarshall(item))) || [];
  }

  public async createOrder(order: Omit<Order, "orderId">): Promise<Order> {
    const translatedOrder = this.translate(order);

    await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.ordersTableName,
        Item: marshall(translatedOrder),
        ConditionExpression: "attribute_not_exists(orderId)",
      })
    );

    return translatedOrder;
  }

  public async deleteOrder(orderId: string): Promise<void> {
    await this.ddbClient.send(
      new DeleteItemCommand({
        TableName: this.ordersTableName,
        Key: marshall({
          orderId,
        }),
      })
    );
  }

  public async updateOrder(order: Order): Promise<Order> {
    const translatedOrder = this.translate(order);

    await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.ordersTableName,
        Item: marshall(translatedOrder),
      })
    );

    return translatedOrder;
  }
}
