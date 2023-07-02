import { GetParametersCommand, SSMClient } from "@aws-sdk/client-ssm";
import axios from "axios";
import { URLSearchParams } from "url";

export interface IOrderService {
  updateOrderStatus(orderId: string, status: string): Promise<void>;
}

export interface IOrderServiceProps {
  ssmClient: SSMClient;
}

export class OrderService implements IOrderService {
  ssmClient: SSMClient;

  constructor(props: IOrderServiceProps) {
    this.ssmClient = props.ssmClient;
  }

  /**
   *
   * @param orderId
   * @param status
   */
  public async updateOrderStatus(
    orderId: string,
    status: string
  ): Promise<void> {
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

    var cognitoAuthRequest = {
      method: "POST",
      url: `${
        ssmResult.Parameters?.find(
          (parameter) => parameter.Name === "/app/order/cognitoUrl"
        )?.Value
      }/oauth2/token`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: ssmResult.Parameters?.find(
          (parameter) => parameter.Name === "/app/order/clientId"
        )?.Value,
        client_secret: ssmResult.Parameters?.find(
          (parameter) => parameter.Name === "/app/order/clientSecret"
        )?.Value,
      }),
    };

    const authResult = await axios.request(cognitoAuthRequest);

    const token: string = authResult.data.access_token;

    const orderUpdateRequest = {
      method: "PUT",
      url: `${
        ssmResult.Parameters?.find(
          (parameter) => parameter.Name === "/app/order/serviceURL"
        )?.Value
      }orders`,
      headers: {
        "content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      data: {
        orderId,
        status,
      },
    };

    await axios.request(orderUpdateRequest);
  }
}
