import { SQSEvent } from "aws-lambda";
import { Logger } from "../../core/shared/logger";
import { MissingEnvironmentVariableException } from "../../core/shared/exceptions";
import { processRecord } from "./message-processor";

// Initialize logger
const logger = new Logger("ValidationResultHandler");

/**
 * Lambda handler - Triggered by an SQS message containing validation results
 * Sends the result to external webhooks
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.debug(`Event: ${JSON.stringify(event)}`);

  try {
    logger.log(
      `ValidationResultHandler lambda invoked with ${event.Records.length} messages`,
    );

    const webhookSuccessUrl = process.env.WEBHOOK_VALIDATION_SUCCESS ?? "";
    const webhookErrorUrl = process.env.WEBHOOK_VALIDATION_ERROR ?? "";

    if (!webhookSuccessUrl) {
      throw new MissingEnvironmentVariableException(
        "WEBHOOK_VALIDATION_SUCCESS",
      );
    }

    if (!webhookErrorUrl) {
      throw new MissingEnvironmentVariableException("WEBHOOK_VALIDATION_ERROR");
    }

    // Process each SQS message
    for (const record of event.Records) {
      await processRecord(record, webhookSuccessUrl, webhookErrorUrl);
    }

    logger.log("Validation result handling complete");
  } catch (error) {
    logger.error(
      `Error in ValidationResultHandler: ${error instanceof Error ? error.message : String(error)}`,
    );
    logger.error(
      `Stack: ${error instanceof Error ? error.stack : "No stack available"}`,
    );
    throw error;
  }
}; 