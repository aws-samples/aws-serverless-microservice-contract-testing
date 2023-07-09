# Welcome to the AWS Serverless Microservice Contract Testing Example Consumer Service Project

## Description

This is an example typescript minimal project that demonstrates how a consumer could implement consumer driven contract tests against an example provider service.

## Useful Commands

- `npm install` will download the necessary packages to run the application and associated tests.
- `npm run test` will run the tests associated with this project. Note: this test will generate a consumer driven contract (pact). See output pact file [here](./pacts/example-consumer-service-orders-service.json) that was generated via running the unit test. See associated that implements the test with more details [here](./src/__tests_/cdc-test-example-consumer-service-orders-service.test.ts)
