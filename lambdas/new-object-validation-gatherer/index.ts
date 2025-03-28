import { SQSEvent } from "aws-lambda";

import { SQSService } from "../../core/aws/sqs.service";
import { ChecklistApiService } from "../../core/integrations/checklist-api.service";
import { Logger } from "../../core/shared/logger";
import {
  FileIdExtractionMessageBody,
  ProcessingStage,
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

  // Parse the message body from the previous step (bucket-file-id-extractor)
  const messageBody: FileIdExtractionMessageBody = JSON.parse(
    record.body,
  ) as FileIdExtractionMessageBody;

  const { objectInfo: tempFileInfo, uploadedAssignationFileId, finalFileName } = messageBody;

  logger.log(
    `Processing file ID: ${uploadedAssignationFileId} for temp file: ${tempFileInfo.key}`,
  );
  
  if (finalFileName) {
    logger.log(`Target final file name: ${finalFileName}`);
  }

  // Retrieve checklist metadata using the extracted assignation file ID
  try {
    const checklistMetadata = await checklistApiService.getAssignationFileMetadata(
      uploadedAssignationFileId,
    );

    logger.log(`Retrieved checklist metadata for ID: ${uploadedAssignationFileId}`);

    // Create SQS message with temp file info, desired filename and checklist metadata
    const validationMessageBody: ValidationMessageBody = {
      name: tempFileInfo.name,
      objectInfo: tempFileInfo,  // Still a reference to the temp file at this point
      metadata: checklistMetadata,
      finalFileName,  // The desired final filename for the permanent storage
    };

    // Add metadata as message attributes to help with DLQ processing
    const messageAttributes = {
      processingStage: {
        DataType: "String",
        StringValue: ProcessingStage.VALIDATION_GATHERING
      },
      assignationId: {
        DataType: "String",
        StringValue: uploadedAssignationFileId
      },
      originalMessageId: {
        DataType: "String",
        StringValue: record.messageId
      },
      timestamp: {
        DataType: "String",
        StringValue: new Date().toISOString()
      }
    };

    // Send message to validation queue
    logger.log(`Sending message to validation queue: ${validationQueueUrl}`);
    await sqsService.sendMessage(validationQueueUrl, validationMessageBody, messageAttributes);

    logger.log(`Successfully queued ${tempFileInfo.name} for validation`);
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