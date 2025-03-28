import { SQSService } from "../../core/aws/sqs.service";
import { Logger } from "../../core/shared/logger";
import { ProcessingStage, ValidationResultMessageBody } from "../../core/shared/types";
import { SQSOperationException } from "../../core/shared/exceptions";

const logger = new Logger("MessagePublisher");
const sqsService = new SQSService({
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development",
});

/**
 * Publish a validation result message to the result queue
 */
export async function publishValidationResult(
  resultMessageBody: ValidationResultMessageBody,
  resultQueueUrl: string,
  originalMessageId: string,
  stage: ProcessingStage,
  errorType: string,
  errorMessage: string
): Promise<void> {
  try {
    // Add message attributes
    const messageAttributes = {
      processingStage: {
        DataType: "String",
        StringValue: ProcessingStage.VALIDATION_PROCESSING
      },
      validationStatus: {
        DataType: "String",
        StringValue: "invalid"
      },
      originalMessageId: {
        DataType: "String",
        StringValue: originalMessageId
      },
      errorSource: {
        DataType: "String",
        StringValue: `dlq_${stage}`
      },
      errorType: {
        DataType: "String",
        StringValue: errorType
      },
      errorDetails: {
        DataType: "String",
        StringValue: errorMessage.substring(0, 250) // Truncate to avoid exceeding attribute size limits
      },
      failedStage: {
        DataType: "String",
        StringValue: stage
      },
      timestamp: {
        DataType: "String",
        StringValue: new Date().toISOString()
      }
    };

    logger.log(`Sending failed validation result to queue: ${resultQueueUrl}`);
    await sqsService.sendMessage(resultQueueUrl, resultMessageBody, messageAttributes);
    logger.log(`Successfully sent DLQ failure to validation result handler`);
  } catch (error) {
    if (error instanceof Error) {
      throw new SQSOperationException("send", error);
    }
    throw new SQSOperationException("send", String(error));
  }
} 