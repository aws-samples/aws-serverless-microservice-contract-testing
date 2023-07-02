import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { v4 as uuidv4 } from "uuid";
import { Shipment } from "../models/Shipment";

export interface IShipmentsRepository {
  getShipmentById(shipmentId: string): Promise<Shipment | null>;
  getShipments(): Promise<Shipment[]>;
  createShipment(shipment: Omit<Shipment, "shipmentId">): Promise<Shipment>;
  deleteShipment(shipmentId: string): Promise<void>;
  updateShipment(shipment: Shipment): Promise<Shipment>;
}

export interface IShipmentsRepositoryProps {
  ddbClient: DynamoDBClient;
}

export class ShipmentsRepository implements IShipmentsRepository {
  private ddbClient: DynamoDBClient;
  private shipmentsTableName: string;

  constructor(props: IShipmentsRepositoryProps) {
    this.ddbClient = props.ddbClient;
    this.shipmentsTableName = process.env.TABLE_NAME_SHIPMENTS!;
  }

  private translate(record: Partial<Shipment>): Shipment {
    return {
      shipmentId: record.shipmentId || this.generatePK(),
      orderId: record.orderId!,
      trackingNumber: record.trackingNumber || "N/A",
      status: record.status || "IN_FLIGHT",
    };
  }

  private generatePK(): string {
    return uuidv4();
  }

  public async getShipmentById(shipmentId: string): Promise<Shipment | null> {
    const result = await this.ddbClient.send(
      new GetItemCommand({
        TableName: this.shipmentsTableName,
        Key: marshall({
          shipmentId,
        }),
      })
    );

    return result.Item ? this.translate(unmarshall(result.Item)) : null;
  }

  public async getShipments(): Promise<Shipment[]> {
    // NOTE: the below implementation does not use proper pagination and is for demo purposes only.
    const result = await this.ddbClient.send(
      new ScanCommand({
        TableName: this.shipmentsTableName,
      })
    );

    return result.Items?.map((item) => this.translate(unmarshall(item))) || [];
  }

  public async createShipment(
    shipment: Omit<Shipment, "shipmentId">
  ): Promise<Shipment> {
    const translatedShipment = this.translate(shipment);

    await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.shipmentsTableName,
        Item: marshall(translatedShipment),
        ConditionExpression: "attribute_not_exists(shipmentId)",
      })
    );

    return translatedShipment;
  }

  public async deleteShipment(shipmentId: string): Promise<void> {
    await this.ddbClient.send(
      new DeleteItemCommand({
        TableName: this.shipmentsTableName,
        Key: marshall({
          shipmentId,
        }),
      })
    );
  }

  public async updateShipment(shipment: Shipment): Promise<Shipment> {
    const translatedShipment = this.translate(shipment);

    await this.ddbClient.send(
      new PutItemCommand({
        TableName: this.shipmentsTableName,
        Item: marshall(translatedShipment),
      })
    );

    return translatedShipment;
  }
}
