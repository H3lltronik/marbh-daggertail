import { SQSEvent } from "aws-lambda";
import { Logger } from "../../core/shared/logger";
import { ProcessingStage, ValidationResultMessageBody } from "../../core/shared/types";
import { extractMessageData } from "./message-extractor";
import { createValidationChecksForFailure, createIdExtractionValidationResult, createMetadataGatheringValidationResult, createProcessingValidationResult } from "./validation-builder";
import { publishValidationResult } from "./message-publisher";

const logger = new Logger("DLQRecordProcessor");

/**
 * Process a single DLQ record
 */
export async function processDLQRecord(
  record: SQSEvent["Records"][0],
  resultQueueUrl: string
): Promise<void> {
  logger.log(`Processing DLQ message: ${record.messageId}`);
  
  try {
    // Parse the original message attributes to determine the stage
    const messageAttributes = record.messageAttributes || {};
    
    const stage = (messageAttributes.processingStage?.stringValue as ProcessingStage) || 
                  ProcessingStage.FILE_ID_EXTRACTION;
    
    const errorType = messageAttributes.errorType?.stringValue || "Unknown";
    const errorMessage = messageAttributes.errorMessage?.stringValue || "Unknown error";
    const retryCount = parseInt(messageAttributes.retryCount?.stringValue || "1", 10);
    const originalMessageId = messageAttributes.originalMessageId?.stringValue;
    
    logger.log(`Failed at stage: ${stage}, error: ${errorType} - ${errorMessage}, retries: ${retryCount}`);
    
    // Extract available data from the message body
    const { fileInfo, finalFileName, assignationId, metadata } = extractMessageData(record.body, stage);
    
    logger.log(`Extracted file info for: ${fileInfo.key}`);
    
    // Create validation checks
    const validationChecks = createValidationChecksForFailure(stage, errorType, errorMessage);
    
    // Create a ValidationResult using only the data we have
    // We'll build this carefully based on what stage the failure occurred
    let resultMessageBody: ValidationResultMessageBody;
    
    if (stage === ProcessingStage.FILE_ID_EXTRACTION) {
      // We only have file info and assignation ID at this stage
      const validationResult = createIdExtractionValidationResult(
        fileInfo, 
        validationChecks, 
        assignationId
      );
      
      resultMessageBody = {
        name: fileInfo.name,
        objectInfo: fileInfo,
        metadata: validationResult.metadata,
        finalFileName,
        validationResult
      };
    } else if (stage === ProcessingStage.VALIDATION_GATHERING && !metadata) {
      // Failed during validation gathering but before getting metadata
      const validationResult = createMetadataGatheringValidationResult(
        fileInfo,
        validationChecks,
        assignationId
      );
      
      resultMessageBody = {
        name: fileInfo.name,
        objectInfo: fileInfo,
        metadata: validationResult.metadata,
        finalFileName,
        validationResult
      };
    } else {
      // We have metadata at this point, use it
      const validationResult = createProcessingValidationResult(
        fileInfo,
        validationChecks,
        metadata!
      );
      
      resultMessageBody = {
        name: fileInfo.name,
        objectInfo: fileInfo,
        metadata: metadata!,
        finalFileName,
        validationResult
      };
    }
    
    // Send to the validation result queue
    await publishValidationResult(
      resultMessageBody,
      resultQueueUrl,
      record.messageId,
      stage,
      errorType,
      errorMessage
    );
  } catch (error) {
    logger.error(`Error processing DLQ message: ${error instanceof Error ? error.message : String(error)}`);
    // Don't rethrow here - we want to continue processing other messages even if one fails
    // This prevents an infinite loop of DLQ messages
  }
} 