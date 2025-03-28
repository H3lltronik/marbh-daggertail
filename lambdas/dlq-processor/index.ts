import { SQSEvent } from "aws-lambda";
import { Logger } from "../../core/shared/logger";
import { MissingEnvironmentVariableException } from "../../core/shared/exceptions";
import { processDLQRecord } from "./record-processor";

// Initialize logger
const logger = new Logger("DLQProcessor");

/**
 * Lambda handler - Triggered by messages in the DLQ
 * Processes failed messages and sends them to the validation result handler with error information
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.debug(`Event: ${JSON.stringify(event)}`);

  try {
    logger.log(`DLQProcessor lambda invoked with ${event.Records.length} messages`);

    const resultQueueUrl = process.env.VALIDATION_RESULT_QUEUE_URL;
    if (!resultQueueUrl) {
      throw new MissingEnvironmentVariableException("VALIDATION_RESULT_QUEUE_URL");
    }

    // Process each DLQ message
    for (const record of event.Records) {
      await processDLQRecord(record, resultQueueUrl);
    }

    logger.log("DLQ processing complete");
  } catch (error) {
    logger.error(
      `Error in DLQProcessor: ${error instanceof Error ? error.message : String(error)}`
    );
    logger.error(
      `Stack: ${error instanceof Error ? error.stack : "No stack available"}`
    );
    throw error;
  }
}; 