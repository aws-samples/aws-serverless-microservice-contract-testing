import middy from "@middy/core";
import sqsPartialBatchFailure from "@middy/sqs-partial-batch-failure";
import { SQSEvent, SQSRecord } from "aws-lambda";

const processMessage = async (record: SQSRecord) => {
  const message = record.body;

  const parsedBody = JSON.parse(message) as any;

  console.log(parsedBody);
};

export const handler = middy()
  .use(sqsPartialBatchFailure())
  .handler(async (event: SQSEvent, context) => {
    const messageResults = event.Records.map(processMessage);

    return Promise.allSettled(messageResults);
  });
