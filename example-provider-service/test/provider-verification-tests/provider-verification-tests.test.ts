import { Verifier } from "@pact-foundation/pact";
import * as path from "path";

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
