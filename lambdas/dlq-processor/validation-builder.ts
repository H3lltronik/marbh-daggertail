import { Logger } from "../../core/shared/logger";
import {
  ChecklistItemMetadata,
  ProcessingStage,
  S3ObjectInfo,
  ValidationCheck,
  ValidationResult,
} from "../../core/shared/types";

const logger = new Logger("ValidationBuilder");

/**
 * Create validation checks based on the failure
 */
export function createValidationChecksForFailure(
  stage: ProcessingStage,
  errorType: string,
  errorMessage: string
): ValidationCheck[] {
  const stageDescriptions = {
    [ProcessingStage.FILE_ID_EXTRACTION]: "File ID extraction",
    [ProcessingStage.VALIDATION_GATHERING]: "Validation metadata gathering",
    [ProcessingStage.VALIDATION_PROCESSING]: "File validation processing",
    [ProcessingStage.VALIDATION_RESULT]: "Result handling"
  };
  
  const stageName = stageDescriptions[stage] || String(stage);
  
  // Create a validation check for this error
  const validationChecks: ValidationCheck[] = [
    {
      name: `${stageName}Failure`,
      passed: false,
      because: `${stageName} failed: ${errorMessage}`
    },
    {
      name: "processingError",
      passed: false,
      because: `Error type: ${errorType}. This file failed during processing and was sent to the DLQ.`
    }
  ];
  
  return validationChecks;
}

/**
 * Create a minimal validation result for a file that failed in ID extraction stage
 */
export function createIdExtractionValidationResult(
  fileInfo: S3ObjectInfo,
  validationChecks: ValidationCheck[],
  assignationId?: string
): ValidationResult {
  logger.log(`Creating minimal validation result with assignation ID: ${assignationId}`);
  
  const errors = validationChecks.map(check => check.because);
  
  return {
    isValid: false,
    errors,
    objectInfo: fileInfo,
    metadata: {
      uuid: assignationId || "unknown", // This is crucial for the webhook
      checklistItemType: "CHECKLIST_ITEM",
      checklistItemId: 0,
      checklistItem: {
        uuid: assignationId || "unknown",
        title: "Unknown - Processing Failed",
        description: "Processing failed before metadata could be retrieved",
        maxFiles: 0,
        minFiles: 0,
        maxSize: 0,
        sizeSuffix: "MB",
        allowedMimeTypes: []
      },
      uploadedFilesLength: 0
    },
    contentType: fileInfo.contentType || "application/octet-stream",
    validationChecks
  };
}

/**
 * Create a validation result for a file that failed in metadata gathering stage
 */
export function createMetadataGatheringValidationResult(
  fileInfo: S3ObjectInfo,
  validationChecks: ValidationCheck[],
  assignationId?: string
): ValidationResult {
  logger.log(`Creating validation result for failed metadata gathering with assignation ID: ${assignationId}`);
  
  const errors = validationChecks.map(check => check.because);
  
  return {
    isValid: false,
    errors,
    objectInfo: fileInfo,
    metadata: {
      uuid: assignationId || "unknown", // Pass the ID from the original message
      checklistItemType: "CHECKLIST_ITEM",
      checklistItemId: 0,
      checklistItem: {
        uuid: assignationId || "unknown",
        title: "Metadata Retrieval Failed",
        description: "The system failed to retrieve checklist metadata",
        maxFiles: 0,
        minFiles: 0,
        maxSize: 0,
        sizeSuffix: "MB",
        allowedMimeTypes: []
      },
      uploadedFilesLength: 0
    },
    contentType: fileInfo.contentType || "application/octet-stream",
    validationChecks
  };
}

/**
 * Create a validation result for a file that failed in validation processing or result stage
 */
export function createProcessingValidationResult(
  fileInfo: S3ObjectInfo,
  validationChecks: ValidationCheck[],
  metadata: ChecklistItemMetadata
): ValidationResult {
  logger.log(`Creating validation result with existing metadata`);
  
  const errors = validationChecks.map(check => check.because);
  
  return {
    isValid: false,
    errors,
    objectInfo: fileInfo,
    metadata,
    contentType: fileInfo.contentType || "application/octet-stream",
    validationChecks
  };
} 