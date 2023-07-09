# Welcome to AWS Serverless Microservice Contract Testing

## Description

This is a sample repository which implements contract testing of a serverless microservice. The repository contains two example projects:
- example-consumer-service
    - This is an example typescript application that is a consumer to Order Service.
    - see [README.md](./example-consumer-service/README.md)
- example-provider-service
    - This is the microservice (Order Service) being deployed and tested as a provider.
    - See [README.md](./example-provider-service/README.md)

These projects utilize the open source code-first tool, [Pact](https://docs.pact.io) for testing HTTP and message integrations via contract testing.

## Architecture

[Architecture Diagram](./images/Full-Architecture-Diagram.png)
