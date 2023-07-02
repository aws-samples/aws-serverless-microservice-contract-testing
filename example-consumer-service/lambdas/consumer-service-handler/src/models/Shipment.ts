export type ShipmentStatus = "IN_FLIGHT" | "OUT_FOR_DELIVERY" | "DELIVERED";

export type Shipment = {
  shipmentId: string;
  orderId: string;
  trackingNumber: string;
  status: ShipmentStatus;
};
