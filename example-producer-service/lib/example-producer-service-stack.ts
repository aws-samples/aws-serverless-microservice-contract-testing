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
import {
  AdvancedSecurityMode,
  CfnUserPoolResourceServer,
  OAuthScope,
  UserPool,
} from "aws-cdk-lib/aws-cognito";
import { AttributeType, Table } from "aws-cdk-lib/aws-dynamodb";
import { IFunction } from "aws-cdk-lib/aws-lambda";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import * as path from "path";
import { NodejsFunctionWithRole } from "./constructs/NodejsFunctionWithRole";

interface AddApiResourceProps {
  parentResource: IResource;
  resourceName: string;
  methods: string[];
  handler: IFunction;
  cognitoAuthorizer: CognitoUserPoolsAuthorizer;
}

export class ExampleProducerServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ordersTable = new Table(this, "OrdersTable", {
      partitionKey: {
        name: "orderId",
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

    const cognitoDomain = userPool.addDomain("CognitoDomain", {
      cognitoDomain: {
        domainPrefix: "orders",
      },
    });

    const ordersResourceServer = new CfnUserPoolResourceServer(
      this,
      "dev-userpool-resource-server",
      {
        identifier: "orders",
        name: "orders-service",
        userPoolId: userPool.userPoolId,
        scopes: [
          {
            scopeDescription: "Read Orders Data",
            scopeName: "read",
          },
          {
            scopeDescription: "Write Orders Data",
            scopeName: "write",
          },
        ],
      }
    );

    const client = userPool.addClient("FulfillmentServiceClient", {
      generateSecret: true,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          clientCredentials: true,
          authorizationCodeGrant: false,
          implicitCodeGrant: false,
        },
        scopes: [
          OAuthScope.custom("orders/read"),
          OAuthScope.custom("orders/write"),
        ],
      },
    });

    client.node.addDependency(ordersResourceServer);

    userPool.addClient("UserPoolClientForPostman", {
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
      )}/../lambdas/producer-service-handler/src/index.ts`,
      environment: {
        TABLE_NAME_ORDERS: ordersTable.tableName,
      },
    });

    ordersTable.grantReadWriteData(handler.executionRole);

    const logGroup = new LogGroup(this, "ApiLogs");

    const restApi = new RestApi(this, "ProducerServiceAPI", {
      restApiName: "Example Producer Service API",
      description:
        "An example of a service that produces some data that consumer service needs",
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
      cloudWatchRole: true,
    });

    const ordersResource = this.addLambdaBackedEndpoint({
      parentResource: restApi.root,
      resourceName: "orders",
      methods: ["POST", "PUT", "GET"],
      handler: handler.function,
      cognitoAuthorizer,
    });

    const ordersDetailsResource = ordersResource.addResource("details");

    this.addLambdaBackedEndpoint({
      parentResource: ordersDetailsResource,
      resourceName: "{orderId}",
      methods: ["GET", "DELETE"],
      handler: handler.function,
      cognitoAuthorizer,
    });

    new StringParameter(this, "OrdersServiceURL", {
      stringValue: restApi.url,
      parameterName: "/app/order/serviceURL",
    });

    new StringParameter(this, "OrderClientId", {
      stringValue: client.userPoolClientId,
      parameterName: "/app/order/clientId",
    });

    new StringParameter(this, "OrderCognitoURL", {
      stringValue: `https://${cognitoDomain.domainName}.auth.${cdk.Aws.REGION}.amazoncognito.com`,
      parameterName: "/app/order/cognitoUrl",
    });

    new StringParameter(this, "OrderCognitoUserPoolId", {
      stringValue: userPool.userPoolId,
      parameterName: "/app/order/userPoolId",
    });

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
  }

  private addLambdaBackedEndpoint(props: AddApiResourceProps) {
    const newResource = props.parentResource.addResource(props.resourceName);

    for (const method of props.methods) {
      newResource.addMethod(method, new LambdaIntegration(props.handler), {
        authorizationType: AuthorizationType.COGNITO,
        authorizer: props.cognitoAuthorizer,
        authorizationScopes: ["orders/read", "orders/write"],
      });
    }
    return newResource;
  }
}
