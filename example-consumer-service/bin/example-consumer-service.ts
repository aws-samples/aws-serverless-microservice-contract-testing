#!/usr/bin/env node
import "source-map-support/register";
import { Aspects, App } from "aws-cdk-lib";
import { ExampleConsumerServiceStack } from "../lib/example-consumer-service-stack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new App();
new ExampleConsumerServiceStack(app, "ExampleConsumerServiceStack", {});

Aspects.of(app).add(new AwsSolutionsChecks({}));
