import { GetParametersCommand, SSM, SSMClient } from "@aws-sdk/client-ssm";
import { Order, OrderStatus } from "./models/Order";
import axios from "axios";

export interface IOrderService {
  getOrderById(orderId: string): Promise<Order>;
  getOrders(): Promise<Order[]>;
  createOrder(customerId: string, status: OrderStatus): Promise<Order>;
}

export interface IOrderServiceProps {
  ssmClient: SSMClient;
  ordersServiceURL: string;
}

export class OrdersService implements IOrderService {
  private ssmClient: SSMClient;
  private cognitoURL?: string;
  private clientId?: string;
  private clientSecret?: string;
  private ordersServiceURL?: string;

  constructor(props: IOrderServiceProps) {
    this.ssmClient = props.ssmClient;
    this.ordersServiceURL = props.ordersServiceURL;
  }

  public async getOrders(): Promise<Order[]> {
    let authToken = "";

    if (!this.ordersServiceURL) {
      await this.setCognitoParams();

      authToken = await this.generateAuthToken();
    }

    const result = await axios.get<Order[]>(`${this.ordersServiceURL}/orders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
      },
    });

    return result.data;
  }

  public async getOrderById(orderId: string): Promise<Order> {
    let authToken = "";

    if (!this.ordersServiceURL) {
      await this.setCognitoParams();

      authToken = await this.generateAuthToken();
    }
    const result = await axios.get<Order>(
      `${this.ordersServiceURL}/orders/details/${orderId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
        },
      }
    );

    return result.data;
  }

  public async createOrder(
    customerId: string,
    status: OrderStatus
  ): Promise<Order> {
    let authToken = "";

    if (!this.ordersServiceURL) {
      await this.setCognitoParams();

      authToken = await this.generateAuthToken();
    }

    const result = await axios.post<Order>(
      `${this.ordersServiceURL}/orders`,
      {
        customerId,
        status,
      },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
        },
      }
    );

    return result.data;
  }

  private async setCognitoParams(): Promise<void> {
    const ssmResult = await this.ssmClient.send(
      new GetParametersCommand({
        Names: [
          "/app/order/serviceURL",
          "/app/order/clientId",
          "/app/order/clientSecret",
          "/app/order/cognitoUrl",
        ],
        WithDecryption: true,
      })
    );

    this.cognitoURL = ssmResult.Parameters?.find(
      (parameter) => parameter.Name === "/app/order/cognitoUrl"
    )?.Value!;
    this.clientId = ssmResult.Parameters?.find(
      (parameter) => parameter.Name === "/app/order/clientId"
    )?.Value!;
    this.clientSecret = ssmResult.Parameters?.find(
      (parameter) => parameter.Name === "/app/order/clientSecret"
    )?.Value!;

    if (!this.ordersServiceURL) {
      this.ordersServiceURL = ssmResult.Parameters?.find(
        (parameter) => parameter.Name === "/app/order/serviceURL"
      )?.Value!;
    }
  }

  private async generateAuthToken(): Promise<string> {
    console.log(this.cognitoURL);
    console.log(this.clientId);
    console.log(this.clientSecret);

    const token = await axios.post(
      `${this.cognitoURL}/oauth2/token`,
      `client_id=${this.clientId}&client_secret=${this.clientSecret}&grant_type=client_credentials`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(this.clientId + ":" + this.clientSecret).toString(
              "base64"
            ),
        },
      }
    );

    return token.data.access_token;
  }
}
