#!/usr/bin/env node
import "source-map-support/register";
import { Aspects, App } from "aws-cdk-lib";
import { ExampleProviderServiceStack } from "../lib/example-provider-service-stack";
import { AwsSolutionsChecks } from "cdk-nag";

const app = new App();
new ExampleProviderServiceStack(app, "ExampleProviderServiceStack", {});

Aspects.of(app).add(new AwsSolutionsChecks({}));
