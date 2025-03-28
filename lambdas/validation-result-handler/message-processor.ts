import { SQSEvent } from "aws-lambda";
import { Logger } from "../../core/shared/logger";
import { ProcessingStage, ValidationResultMessageBody } from "../../core/shared/types";
import { sendWebhook } from "./webhook-sender";

const logger = new Logger("MessageProcessor");

/**
 * Create an error message for validation failure
 */
export function createErrorMessage(
  validationErrors: string[],
  isFromDlq: boolean,
  messageAttributes: Record<string, any>
): string {
  // Start with the basic error message from validation errors
  let errorMessage = validationErrors.join("; ");
  
  if (isFromDlq) {
    // Extract more detailed information from message attributes if available
    const failedStage = messageAttributes.failedStage?.stringValue;
    const errorType = messageAttributes.errorType?.stringValue;
    const stageNames = {
      [ProcessingStage.FILE_ID_EXTRACTION]: "File ID extraction",
      [ProcessingStage.VALIDATION_GATHERING]: "Metadata gathering",
      [ProcessingStage.VALIDATION_PROCESSING]: "Validation processing",
      [ProcessingStage.VALIDATION_RESULT]: "Result handling"
    };
    const stageName = failedStage ? stageNames[failedStage as ProcessingStage] || failedStage : "Processing";
    
    // Add additional context for DLQ errors
    errorMessage = `${stageName} error: ${errorMessage}`;
    if (errorType) {
      errorMessage += ` (${errorType})`;
    }
  }
  
  return errorMessage;
}

/**
 * Process a single SQS record
 */
export async function processRecord(
  record: SQSEvent["Records"][0],
  webhookSuccessUrl: string,
  webhookErrorUrl: string,
): Promise<void> {
  logger.log(`Processing SQS message: ${record.messageId}`);

  // Check if this message is from the DLQ processor
  const messageAttributes = record.messageAttributes || {};
  const errorSource = messageAttributes.errorSource?.stringValue || "";
  const isFromDlq = errorSource.startsWith("dlq_");
  
  if (isFromDlq) {
    const failedStage = messageAttributes.failedStage?.stringValue;
    const errorType = messageAttributes.errorType?.stringValue;
    const errorDetails = messageAttributes.errorDetails?.stringValue;
    
    logger.log(`Processing error message from DLQ, original stage: ${failedStage || errorSource.substring(4)}`);
    if (errorType) {
      logger.log(`Error type: ${errorType}`);
    }
    if (errorDetails) {
      logger.log(`Error details: ${errorDetails}`);
    }
  }

  // Parse the message body from the validation processor step or DLQ processor
  const messageBody: ValidationResultMessageBody = JSON.parse(record.body) as ValidationResultMessageBody;
  const { objectInfo: fileInfo, validationResult } = messageBody;

  // At this point, objectInfo could be either the temp file info (if validation failed)
  // or the permanent file info (if validation passed and the file was moved)
  const fileLocation = validationResult.isValid ? 'permanent' : 'temporary';
  
  logger.log(`Handling validation result for ${fileLocation} file: ${fileInfo.key}`);
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

  // Get UUID - this is crucial for the webhook
  const uuid = validationResult.metadata.uuid;
  if (!uuid || uuid === "unknown") {
    logger.warn("No valid UUID found in validation result metadata");
  }

  // Prepare error message if this is a failed validation
  let errorMessage = "";
  if (!validationResult.isValid) {
    errorMessage = createErrorMessage(
      validationResult.errors,
      isFromDlq,
      messageAttributes
    );
  }

  // Send appropriate webhook
  await sendWebhook(
    fileInfo,
    validationResult,
    isFromDlq,
    errorMessage,
    webhookSuccessUrl,
    webhookErrorUrl
  );
} 