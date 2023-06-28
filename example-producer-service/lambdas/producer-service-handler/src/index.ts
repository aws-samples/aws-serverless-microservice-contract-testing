import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
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
import { OrdersRepository } from "./repositories/orders-repository";
import { OrdersService } from "./services/orders-service";
import { logger, tracer } from "./utils/common";
import { Order } from "./models/Order";

const headers = {
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Origin": "*",
};

const ddbClient = tracer.captureAWSv3Client(
  new DynamoDBClient({ region: process.env.REGION })
);

const ordersRepository = new OrdersRepository({
  ddbClient,
});

const ordersService = new OrdersService({
  ordersRepository,
});

const getOrdersHandler = middy().handler(
  async (
    _event: APIGatewayProxyEvent,
    _context: Context
  ): Promise<APIGatewayProxyResult> => {
    const result = await ordersService.getOrders();

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers,
    };
  }
);

const getOrderDetailsHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["pathParameters"],
        properties: {
          pathParameters: {
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
      const orderId = event.pathParameters!.orderId!;

      const result = await ordersService.getOrderById(orderId);

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

const createOrderHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "object",
            required: ["customerId"],
            properties: {
              customerId: {
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
      const order = event.body as any as Omit<Order, "orderId">;

      const result = await ordersService.createOrder(order);

      return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers,
      };
    }
  );

const deleteOrderDetailsHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["pathParameters"],
        properties: {
          pathParameters: {
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
      const orderId = event.pathParameters!.orderId!;

      await ordersService.deleteOrder(orderId);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Order deleted.",
        }),
        headers,
      };
    }
  );

const updateOrderHandler = middy()
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema({
        type: "object",
        required: ["body"],
        properties: {
          body: {
            type: "object",
            required: ["customerId", "orderId"],
            properties: {
              orderId: {
                type: "string",
              },
              customerId: {
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
      const order = event.body as any as Order;

      const result = await ordersService.updateOrder(order);

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
    handler: getOrdersHandler,
    path: "/orders",
  },
  {
    method: "GET",
    handler: getOrderDetailsHandler,
    path: "/orders/details/{orderId}",
  },
  {
    method: "POST",
    handler: createOrderHandler,
    path: "/orders",
  },
  {
    method: "DELETE",
    handler: deleteOrderDetailsHandler,
    path: "/orders/details/{orderId}",
  },
  {
    method: "PUT",
    handler: updateOrderHandler,
    path: "/orders",
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
