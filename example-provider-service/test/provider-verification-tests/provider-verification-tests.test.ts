import { Verifier } from "@pact-foundation/pact";
import * as path from "path";

/**
 * These tests will run the provider verification step of the pact process.
 * Any associated pacts detected will automatically generate requests and validates if this service meets the expectation of the outlined interaction.
 * This test is configured to verify the pact created by the example-consumer-service.
 * Since this is a serverless microservice, SAM will be utilized to run this application locally so that provider verification can be successful.
 */
describe("Pact Verification", () => {
  it("validates the expectations of Orders Service as a provider", async () => {
    await new Verifier({
      providerBaseUrl: "http://localhost:3000",
      pactUrls: [
        path.resolve(
          process.cwd(),
          "../example-consumer-service/pacts/example-consumer-service-orders-service.json"
        ),
      ],
    })
      .verifyProvider()
      .then(() => {
        console.log("Pact Verification Complete!");
      });
  }, 60000);
});
