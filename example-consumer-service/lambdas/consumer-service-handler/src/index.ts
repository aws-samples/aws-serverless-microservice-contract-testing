import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { SSMClient } from "@aws-sdk/client-ssm";
import middy from "@middy/core";
import httpHeaderNormalizer from "@middy/http-header-normalizer";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpRouterHandler, { Route } from "@middy/http-router";
import validatorMiddleware from "@middy/validator";
import { transpileSchema } from "@middy/validator/transpile";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Shipment } from "./models/Shipment";
import { ShipmentsRepository } from "./repositories/shipment-repository";
import { ShipmentsService } from "./services/shipment-service";
import { logger, tracer } from "./utils/common";
import { ShipmentEventService } from "./services/shipment-event-service";

const headers = {
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Origin": "*",
};

const ddbClient = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.REGION })
);

const ssmClient = tracer.captureAWSv3Client(
  new SSMClient({ region: process.env.REGION })
);

const eventBridgeClient = tracer.captureAWSv3Client(
  new EventBridgeClient({ region: process.env.REGION })
);

const shipmentsRepository = new ShipmentsRepository({
  ddbClient,
});

const shipmentEventService = new ShipmentEventService({
  eventBridgeClient,
});

const shipmentsService = new ShipmentsService({
  shipmentsRepository,
  shipmentEventService,
});

const getShipmentsHandler = middy().handler(
  async (
    _event: APIGatewayProxyEvent,
    _context: Context
  ): Promise<APIGatewayProxyResult> => {
    const result = await shipmentsService.getShipments();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers,
    };
  }
);

const getShipmentDetailsHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["pathParameters"],
        properties: {
          pathParameters: {
            type: "object",
            required: ["shipmentId"],
            properties: {
              shipmentId: {
                type: "string",
              },
            },
          },
        },
      }),
    })
  )
  .handler(
    async (
      event: APIGatewayProxyEvent,
      _context: Context
    ): Promise<APIGatewayProxyResult> => {
      const shipmentId = event.pathParameters!.shipmentId!;

      const result = await shipmentsService.getShipmentById(shipmentId);

      return result
        ? {
            statusCode: 200,
            body: JSON.stringify(result),
            headers,
          }
        : {
            statusCode: 404,
            body: JSON.stringify({ message: "Not Found." }),
            headers,
          };
    }
  );

const createShipmentHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "object",
            required: ["orderId"],
            properties: {
              orderId: {
                type: "string",
              },
            },
          },
        },
      }),
    })
  )
  .handler(
    async (
      event: APIGatewayProxyEvent,
      _context: Context
    ): Promise<APIGatewayProxyResult> => {
      const shipment = event.body as any as Omit<Shipment, "shipmentId">;

      const result = await shipmentsService.createShipment(shipment);

      return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers,
      };
    }
  );

const deleteShipmentDetailsHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["pathParameters"],
        properties: {
          pathParameters: {
            type: "object",
            required: ["shipmentId"],
            properties: {
              shipmentId: {
                type: "string",
              },
            },
          },
        },
      }),
    })
  )
  .handler(
    async (
      event: APIGatewayProxyEvent,
      _context: Context
    ): Promise<APIGatewayProxyResult> => {
      const shipmentId = event.pathParameters!.shipmentId!;

      await shipmentsService.deleteShipment(shipmentId);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Shipment deleted.",
        }),
        headers,
      };
    }
  );

const updateShipmentHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "object",
            required: ["orderId", "shipmentId"],
            properties: {
              shipmentId: {
                type: "string",
              },
              orderId: {
                type: "string",
              },
            },
          },
        },
      }),
    })
  )
  .handler(
    async (
      event: APIGatewayProxyEvent,
      _context: Context
    ): Promise<APIGatewayProxyResult> => {
      const shipment = event.body as any as Shipment;

      const result = await shipmentsService.updateShipment(shipment);

      return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers,
      };
    }
  );

const routes: Route<APIGatewayProxyEvent>[] = [
  {
    method: "GET",
    handler: getShipmentsHandler,
    path: "/shipments",
  },
  {
    method: "GET",
    handler: getShipmentDetailsHandler,
    path: "/shipments/details/{shipmentId}",
  },
  {
    method: "POST",
    handler: createShipmentHandler,
    path: "/shipments",
  },
  {
    method: "DELETE",
    handler: deleteShipmentDetailsHandler,
    path: "/shipments/details/{shipmentId}",
  },
  {
    method: "PUT",
    handler: updateShipmentHandler,
    path: "/shipments",
  },
];

export const handler = middy()
  .use(httpHeaderNormalizer())
  .use(httpJsonBodyParser())
  .use(captureLambdaHandler(tracer))
  .use(
    injectLambdaContext(logger, {
      clearState: true,
    })
  )
  .handler(httpRouterHandler(routes));
