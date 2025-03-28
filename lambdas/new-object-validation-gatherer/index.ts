import { SQSEvent } from "aws-lambda";

import { SQSService } from "../../core/aws/sqs.service";
import { ChecklistApiService } from "../../core/integrations/checklist-api.service";
import { Logger } from "../../core/shared/logger";
import {
  FileIdExtractionMessageBody,
  ValidationMessageBody,
} from "../../core/shared/types";
import {
  MissingEnvironmentVariableException,
  WebhookException,
} from "../../core/shared/exceptions";

// Initialize services
const logger = new Logger("ValidationGatherer");
const sqsService = new SQSService({
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development",
});
const checklistApiService = new ChecklistApiService();

/**
 * Process a single SQS record
 */
async function processRecord(
  record: SQSEvent["Records"][0],
  validationQueueUrl: string,
): Promise<void> {
  logger.log(`Processing SQS message: ${record.messageId}`);

  // Parse the message body
  const messageBody: FileIdExtractionMessageBody = JSON.parse(
    record.body,
  ) as FileIdExtractionMessageBody;

  const { objectInfo, uploadedAssignationFileId } = messageBody;

  logger.log(
    `Processing file ID: ${uploadedAssignationFileId} for object: ${objectInfo.key}`,
  );

  // Retrieve checklist metadata
  try {
    const metadata = await checklistApiService.getAssignationFileMetadata(
      uploadedAssignationFileId,
    );

    logger.log(`Retrieved metadata for ID: ${uploadedAssignationFileId}`);

    // Create SQS message with object info and metadata
    const validationMessageBody: ValidationMessageBody = {
      name: objectInfo.name,
      objectInfo,
      metadata,
    };

    // Send message to validation queue
    logger.log(`Sending message to validation queue: ${validationQueueUrl}`);
    await sqsService.sendMessage(validationQueueUrl, validationMessageBody);

    logger.log(`Successfully queued ${objectInfo.name} for validation`);
  } catch (error) {
    logger.error(`Error processing ${uploadedAssignationFileId}: ${error instanceof Error ? error.message : String(error)}`);
    if (error instanceof Error) {
      throw new WebhookException(error);
    }
    throw new WebhookException(String(error));
  }
}

/**
 * Lambda handler - Triggered when it receives a message from SQS with the file ID
 * Retrieves metadata from the checklist API and sends a message to the next SQS queue
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.debug(`Event: ${JSON.stringify(event)}`);

  try {
    logger.log(
      `ValidationGatherer lambda invoked with ${event.Records.length} messages`,
    );

    const validationQueueUrl = process.env.VALIDATION_QUEUE_URL ?? "";
    if (!validationQueueUrl) {
      throw new MissingEnvironmentVariableException("VALIDATION_QUEUE_URL");
    }

    // Verify webhook URL for retrieving checklist data
    const webhookUrl = process.env.WEBHOOK_CHECKLIST_DATA ?? "";
    if (!webhookUrl) {
      throw new MissingEnvironmentVariableException("WEBHOOK_CHECKLIST_DATA");
    }

    // Log current environment for troubleshooting
    logger.debug(`Environment: VALIDATION_QUEUE_URL=${validationQueueUrl}, WEBHOOK_CHECKLIST_DATA=${webhookUrl}`);

    // Process each SQS message
    for (const record of event.Records) {
      await processRecord(record, validationQueueUrl);
    }

    logger.log("Validation gathering process complete");
  } catch (error) {
    logger.error(
      `Error in ValidationGatherer: ${error instanceof Error ? error.message : String(error)}`,
    );
    logger.error(
      `Stack: ${error instanceof Error ? error.stack : "No stack available"}`,
    );
    throw error;
  }
}; 