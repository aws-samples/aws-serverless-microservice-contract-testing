#!/usr/bin/env node
import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { ExampleConsumerServiceStack } from '../lib/example-consumer-service-stack';

const app = new App();
new ExampleConsumerServiceStack(app, 'ExampleConsumerServiceStack', {
});

Aspects.of(app).add(
  new AwsSolutionsChecks({
    verbose: true,
  })
);
