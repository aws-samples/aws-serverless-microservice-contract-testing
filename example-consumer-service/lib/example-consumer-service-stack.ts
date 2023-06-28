import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunctionWithRole } from "./constructs/NodejsFunctionWithRole";
import * as path from "path";
import { IResource } from "aws-cdk-lib/aws-apigateway";
import { IFunction } from "aws-cdk-lib/aws-lambda";

interface AddApiResourceProps {
  parentResource: IResource;
  resourceName: string;
  methods: string[];
  handler: IFunction;
}

export class ExampleConsumerServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new NodejsFunctionWithRole(this, "Handler", {
      entry: `${path.resolve(__dirname)}/../backend/lambdas/s3Event/index.ts`,
    });
  }

  private addLambdaBackedEndpoint(props: AddApiResourceProps) {
    const newResource = props.parentResource.addResource(props.resourceName);

    for (const method of props.methods) {
      newResource.addMethod(
        method,
        new apigateway.LambdaIntegration(props.handler),
        {
          authorizer: props.cognitoAuthorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        }
      );
    }
    return newResource;
  }
}
