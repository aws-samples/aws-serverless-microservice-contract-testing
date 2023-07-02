import { Shipment } from "../models/Shipment";
import { IShipmentsRepository } from "../repositories/shipment-repository";
import {
  IShipmentEventsService,
  ShipmentEventService,
} from "./shipment-event-service";

export interface IShipmentService {
  getShipmentById(shipmentId: string): Promise<Shipment | null>;
  getShipments(): Promise<Shipment[]>;
  createShipment(shipment: Omit<Shipment, "shipmentId">): Promise<Shipment>;
  deleteShipment(shipmentId: string): Promise<void>;
  updateShipment(shipment: Shipment): Promise<Shipment>;
}

export interface IShipmentsServiceProps {
  shipmentsRepository: IShipmentsRepository;
  shipmentEventService: ShipmentEventService;
}

export class ShipmentsService implements IShipmentService {
  shipmentsRepository: IShipmentsRepository;
  shipmentEventService: IShipmentEventsService;

  constructor(props: IShipmentsServiceProps) {
    this.shipmentsRepository = props.shipmentsRepository;
    this.shipmentEventService = props.shipmentEventService;
  }

  /**
   * Gets shipment by id
   * @param shipmentId
   */
  public async getShipmentById(shipmentId: string): Promise<Shipment | null> {
    const result = await this.shipmentsRepository.getShipmentById(shipmentId);

    return result;
  }

  /**
   * Gets all shipments
   */
  public async getShipments(): Promise<Shipment[]> {
    const result = await this.shipmentsRepository.getShipments();

    return result;
  }

  /**
   * Creates a new shipment
   * @param shipment
   */
  public async createShipment(
    shipment: Omit<Shipment, "shipmentId">
  ): Promise<Shipment> {
    const result = await this.shipmentsRepository.createShipment(shipment);

    await this.shipmentEventService.publishShipmentEvent(
      "SHIPMENT_CREATED",
      result
    );

    return result;
  }

  /**
   * Deletes an existing shipment
   * @param shipmentId
   */
  public async deleteShipment(shipmentId: string): Promise<void> {
    await this.shipmentsRepository.deleteShipment(shipmentId);

    await this.shipmentEventService.publishShipmentEvent("SHIPMENT_DELETED", {
      shipmentId,
    });
  }

  /**
   * Updates an shipment
   * @param shipment
   */
  public async updateShipment(shipment: Shipment): Promise<Shipment> {
    const result = await this.shipmentsRepository.updateShipment(shipment);

    await this.shipmentEventService.publishShipmentEvent(
      "SHIPMENT_UPDATED",
      result
    );

    return result;
  }
}
