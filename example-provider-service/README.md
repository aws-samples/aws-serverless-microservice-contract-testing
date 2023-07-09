# Welcome to the AWS Serverless Microservice Contract Testing Example Provider Service Project

## Description

This is an example AWS CDK serverless microservice project that is set up to provide order related data. The application deployed by this project acts as a provider of data to the example consumer service in this repository. This project deploys an microservice that consists of Amazon API Gateway, AWS Lambda, and Amazon DynamoDB to provide simple CRUD (Create, Read, Update, and Delete) operations on a generic order items.

See commands below on how to deploy this project and run the associated provider verification tests impemented by the example consumer service. The provider verficiation tests are implemented with notes [here](./test/provider-verification-tests/provider-verification-tests.test.ts)

## Architecture Diagram

[Architecture Diagram](./images/OrderServiceArchitectureDiagram.jpg)

## Useful commands

### Commands
Note: Some of these commands have prerequsites to run successfully:
* [Docker](https://docs.docker.com/get-started/)
* [AWS SAM](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html)
* [PM2](https://pm2.io/docs/runtime/guide/installation/)
* CDK commands require an AWS Account and configured AWS credentials. More details [here](https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html)

* `./deploy-all.sh` Deploys all resources associated with this application as well as performs some initial setup required for contract testing.
* `npm run test` Runs the unit tests (including provider verification contract unit tests)
* `npm run test:unit` Runs unit tests excluding provider verification tests.
* `npm run test:provider-verification` Runs only provider verification tests.


### Generic CDK Commands
* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Other Notes

* This project contains a postman collection which may be useful if you would like to test the Order Microservice endpoints deployed by CDK. Follow these steps to use this collection:
    1. Import the collection and environment into postman. 
    2. Replace the relevant values in the environment (output by the ./deploy-all.sh command)
    3. Generate an OAuth token by clicking the collection and clicking "Get New Access Token" under the Authorization Tab.
    4. Navigate to the endpoint you would like to test, and hit "Send".
