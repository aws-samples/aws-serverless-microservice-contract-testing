import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { Shipment } from "../models/Shipment";

export type ShipmentEventType =
  | "SHIPMENT_CREATED"
  | "SHIPMENT_UPDATED"
  | "SHIPMENT_DELETED";

export type ShipmentEventDetail = ShipmentCreatedEventDetail;
export type ShipmentCreatedEventDetail = Shipment | ShipmentDeletedEventDetail;
export type ShipmentDeletedEventDetail = {
  shipmentId: string;
};

export interface IShipmentEventsService {
  publishShipmentEvent(
    eventType: ShipmentEventType,
    eventDetail: ShipmentEventDetail
  ): Promise<void>;
}

export interface IShipmentEventServiceProps {
  eventBridgeClient: EventBridgeClient;
}

export class ShipmentEventService implements IShipmentEventsService {
  public static EVENTBRIDGE_SOURCE = "com.demo.shipment";

  eventBridgeClient: EventBridgeClient;

  constructor(props: IShipmentEventServiceProps) {
    this.eventBridgeClient = props.eventBridgeClient;
  }

  public async publishShipmentEvent(
    eventType: "SHIPMENT_CREATED",
    eventDetail: ShipmentCreatedEventDetail
  ): Promise<void> {
    await this.eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            EventBusName: process.env.EVENTBUS_NAME_SHIPMENT,
            Source: ShipmentEventService.EVENTBRIDGE_SOURCE,
            DetailType: eventType,
            Detail: JSON.stringify(eventDetail),
          },
        ],
      })
    );
  }
}
