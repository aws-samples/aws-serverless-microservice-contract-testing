import { Construct } from "constructs";
import * as nodeLambda from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";

export interface NodejsFunctionWithRoleProps {
    entry: string;
    environment?: { [key: string]: string };
    timeout?: cdk.Duration;
    memorySize?: number;
    retryAttempts?: number;
}

export class NodejsFunctionWithRole extends Construct {
    public readonly function: lambda.Function;
    public readonly executionRole: iam.Role;
    constructor(
        scope: Construct,
        id: string,
        props: NodejsFunctionWithRoleProps
    ) {
        super(scope, id);
        const role = new iam.Role(this, "ExecutionRole", {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        });

        role.addToPolicy(
            new iam.PolicyStatement({
                sid: "AllowCloudWatchLogs",
                effect: iam.Effect.ALLOW,
                actions: [
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream",
                    "logs:PutLogEvents",
                ],
                resources: ["*"],
            })
        );

        role.addToPolicy(
            new iam.PolicyStatement({
                sid: "AllowXRayAccess",
                effect: iam.Effect.ALLOW,
                actions: [
                    "xray:PutTraceSegments",
                    "xray:PutTelemetryRecords",
                    "xray:GetSamplingRules",
                    "xray:GetSamplingTargets",
                    "xray:GetSamplingStatisticSummaries",
                ],
                resources: ["*"],
            })
        );

        const lambdaFunction = new nodeLambda.NodejsFunction(
            this,
            "LambdaFunction",
            {
                entry: props.entry,
                runtime: lambda.Runtime.NODEJS_18_X,
                architecture: lambda.Architecture.X86_64,
                role,
                tracing: lambda.Tracing.ACTIVE,
                timeout: props.timeout ?? cdk.Duration.seconds(4),
                memorySize: props.memorySize ?? 512,
                environment: {
                    POWERTOOLS_SERVICE_NAME: id,
                    POWERTOOLS_TRACER_CAPTURE_HTTPS_REQUESTS: "true",
                    POWERTOOLS_LOGGER_LOG_EVENT: "true",
                    LOG_LEVEL: "INFO",
                    ...props.environment,
                },
                bundling: {
                    minify: true,
                    // Exclude @aws-sdk v3 since it's included in the NODEJS_18 runtime
                    externalModules: ["@aws-sdk/*"],
                },
                retryAttempts: props.retryAttempts,
            }
        );
        this.executionRole = role;
        this.function = lambdaFunction;
    }
}
