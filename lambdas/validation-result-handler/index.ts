import { SQSEvent } from "aws-lambda";

import { WebhookService } from "../../core/integrations/webhook.service";
import { Logger } from "../../core/shared/logger";
import { ValidationResultMessageBody } from "../../core/shared/types";
import {
  InvalidFileFormatException,
  MissingEnvironmentVariableException,
  WebhookException,
} from "../../core/shared/exceptions";

// Initialize services
const logger = new Logger("ValidationResultHandler");
const webhookService = new WebhookService();

/**
 * Process a single SQS record
 */
async function processRecord(
  record: SQSEvent["Records"][0],
  webhookSuccessUrl: string,
  webhookErrorUrl: string,
): Promise<void> {
  logger.log(`Processing SQS message: ${record.messageId}`);

  // Parse the message body
  const messageBody: ValidationResultMessageBody = JSON.parse(record.body) as ValidationResultMessageBody;
  const { objectInfo, validationResult } = messageBody;

  logger.log(`Handling validation result for object: ${objectInfo.key}`);
  logger.log(
    `Validation result: ${validationResult.isValid ? "PASSED" : "FAILED"}`,
  );

  if (!validationResult.isValid) {
    logger.warn(`Validation errors: ${validationResult.errors.join("; ")}`);
    
    // Log detailed validation checks for debugging
    for (const check of validationResult.validationChecks) {
      logger.debug(`Validation check - ${check.name}: ${check.because}`);
    }
  }

  const uuid = validationResult.metadata.uuid;

  try {
    // Prepare and send the appropriate payload based on validation result
    if (validationResult.isValid) {
      const successPayload = {
        uuid,
        name: objectInfo.name,
        url: `https://${objectInfo.bucket}.s3.amazonaws.com/${objectInfo.key}`,
        size: objectInfo.size,
        mimetype: validationResult.contentType,
      };

      logger.log(`Sending success webhook to: ${webhookSuccessUrl}`);
      await webhookService.sendWebhook(webhookSuccessUrl, successPayload);
    } else {
      const errorPayload = {
        uuid,
        error: validationResult.errors.join("; "),
        validationDetails: validationResult.validationChecks
          .filter(check => !check.passed)
          .map(check => check.because),
      };

      logger.log(`Sending error webhook to: ${webhookErrorUrl}`);
      await webhookService.sendWebhook(webhookErrorUrl, errorPayload);
    }

    logger.log(`Successfully sent webhook for object: ${objectInfo.key}`);
  } catch (error) {
    if (error instanceof Error) {
      throw new WebhookException(error);
    }
    throw new WebhookException(String(error));
  }
}

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