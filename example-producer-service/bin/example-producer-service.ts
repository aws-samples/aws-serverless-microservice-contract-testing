#!/usr/bin/env node
import "source-map-support/register";
import { Aspects, App } from "aws-cdk-lib";
import { ExampleProducerServiceStack } from "../lib/example-producer-service-stack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new App();
new ExampleProducerServiceStack(app, "ExampleProducerServiceStack", {});

Aspects.of(app).add(new AwsSolutionsChecks({}));
