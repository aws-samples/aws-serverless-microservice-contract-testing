import * as cdk from "aws-cdk-lib";
import {
  AccessLogFormat,
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  Cors,
  EndpointType,
  IResource,
  LambdaIntegration,
  LogGroupLogDestination,
  MethodLoggingLevel,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { AdvancedSecurityMode, UserPool } from "aws-cdk-lib/aws-cognito";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import * as targets from "aws-cdk-lib/aws-events-targets";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { NodejsFunctionWithRole } from "./constructs/NodejsFunctionWithRole";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

interface AddApiResourceProps {
  parentResource: IResource;
  resourceName: string;
  methods: string[];
  handler: IFunction;
  cognitoAuthorizer: CognitoUserPoolsAuthorizer;
}

export class ExampleConsumerServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const shipmentEventBus = new EventBus(this, "ShipmentEventsbus");

    const shipmentEventDLQ = new Queue(this, "ShipmentEventDLQ", {
      enforceSSL: true,
    });
    const shipmentEventQueue = new Queue(this, "ShipmentEventQueue", {
      enforceSSL: true,
      visibilityTimeout: cdk.Duration.seconds(10),
      deadLetterQueue: {
        queue: shipmentEventDLQ,
        maxReceiveCount: 3,
      },
    });

    const shipmentEventRule = new Rule(this, "ShipmentEventRule", {
      eventBus: shipmentEventBus,
      eventPattern: {
        source: ["com.demo.shipment"],
      },
    });

    shipmentEventRule.addTarget(new targets.SqsQueue(shipmentEventQueue));

    const shipmentsTable = new Table(this, "ShipmentsTable", {
      partitionKey: {
        name: "shipmentId",
        type: AttributeType.STRING,
      },
    });

    const userPool = new UserPool(this, "UserPool", {
      selfSignUpEnabled: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      advancedSecurityMode: AdvancedSecurityMode.ENFORCED,
    });

    const client = userPool.addClient("UserPoolClient", {
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
    });

    const cognitoAuthorizer = new CognitoUserPoolsAuthorizer(
      this,
      "UserPoolAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    const handler = new NodejsFunctionWithRole(this, "Handler", {
      entry: `${path.resolve(
        __dirname
      )}/../lambdas/consumer-service-handler/src/index.ts`,
      environment: {
        TABLE_NAME_SHIPMENTS: shipmentsTable.tableName,
        EVENTBUS_NAME_SHIPMENT: shipmentEventBus.eventBusName,
      },
    });

    shipmentEventBus.grantPutEventsTo(handler.executionRole);
    shipmentsTable.grantReadWriteData(handler.executionRole);

    handler.executionRole.addToPolicy(
      new PolicyStatement({
        sid: "AllowSSMGetOrderParameters",
        effect: Effect.ALLOW,
        actions: ["ssm:GetParameters"],
        resources: [
          `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/app/order/cognitoUrl`,
          `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/app/order/clientId`,
          `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/app/order/clientSecret`,
          `arn:${cdk.Aws.PARTITION}:ssm:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:parameter/app/order/serviceURL`,
        ],
      })
    );

    const logGroup = new LogGroup(this, "ApiLogs");

    const restApi = new RestApi(this, "ConsumerServiceAPI", {
      restApiName: "Example Consumer Service API",
      description:
        "An example of a consumer service that is dependent on another service",
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
      deployOptions: {
        tracingEnabled: true,
        accessLogDestination: new LogGroupLogDestination(logGroup),
        accessLogFormat: AccessLogFormat.jsonWithStandardFields(),
        loggingLevel: MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
        allowHeaders: Cors.DEFAULT_HEADERS,
      },
      defaultIntegration: new LambdaIntegration(handler.function),
      defaultMethodOptions: {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: cognitoAuthorizer,
      },
      cloudWatchRole: true,
    });

    const shipmentsResource = this.addLambdaBackedEndpoint({
      parentResource: restApi.root,
      resourceName: "shipments",
      methods: ["POST", "PUT", "GET"],
      handler: handler.function,
      cognitoAuthorizer,
    });

    const shipmentsDetailsResource = shipmentsResource.addResource("details");

    this.addLambdaBackedEndpoint({
      parentResource: shipmentsDetailsResource,
      resourceName: "{shipmentId}",
      methods: ["GET", "DELETE"],
      handler: handler.function,
      cognitoAuthorizer,
    });

    const shipmentEventHandler = new NodejsFunctionWithRole(
      this,
      "ShipmentEventHandler",
      {
        entry: `${path.resolve(
          __dirname
        )}/../lambdas/consumer-service-event-handler/src/index.ts`,
        environment: {
          EVENTBUS_NAME_SHIPMENT: shipmentEventBus.eventBusName,
        },
      }
    );

    const shipmentEventSource = new lambdaEventSources.SqsEventSource(
      shipmentEventQueue
    );

    shipmentEventHandler.function.addEventSource(shipmentEventSource);

    NagSuppressions.addResourceSuppressions(
      restApi,
      [
        {
          id: "AwsSolutions-APIG4",
          reason:
            "This API does indeed implement cognito authorization on all available methods, excluding OPTIONS, which does not traditionally need authorization.",
        },
        {
          id: "AwsSolutions-COG4",
          reason:
            "This API does indeed implement cognito authorization on all available methods, excluding OPTIONS, which does not traditionally need authorization.",
        },
        {
          id: "AwsSolutions-APIG2",
          reason:
            "Request validation is handled via internal Lambda logic provided by an easier to use framework called middy. See lambda code for validation logic.",
        },
        {
          id: "AwsSolutions-IAM4",
          reason: "This role is auto-generated by CDK for demo purposes only.",
        },
      ],
      true
    );

    new StringParameter(this, "ShipmentCognitoUserPoolId", {
      parameterName: "/app/shipment/userPoolId",
      stringValue: userPool.userPoolId,
    });

    new StringParameter(this, "ShipmentCognitoClientId", {
      parameterName: "/app/shipment/clientId",
      stringValue: client.userPoolClientId,
    });
  }

  private addLambdaBackedEndpoint(props: AddApiResourceProps) {
    const newResource = props.parentResource.addResource(props.resourceName);

    for (const method of props.methods) {
      newResource.addMethod(method, new LambdaIntegration(props.handler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: props.cognitoAuthorizer,
      });
    }
    return newResource;
  }
}
