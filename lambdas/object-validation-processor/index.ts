import { SQSEvent } from "aws-lambda";

import { S3Service } from "../../core/aws/s3.service";
import { SQSService } from "../../core/aws/sqs.service";
import { Logger } from "../../core/shared/logger";
import {
  ValidationMessageBody,
  ValidationResult,
  ValidationResultMessageBody,
  ValidationCheck,
  ProcessingStage,
} from "../../core/shared/types";
import {
  MissingEnvironmentVariableException,
  S3OperationException,
  SQSOperationException,
  FileValidationException,
} from "../../core/shared/exceptions";

import { faker } from "@faker-js/faker";

// Initialize services
const logger = new Logger("ObjectValidationProcessor");
const s3Service = new S3Service({
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development",
});
const sqsService = new SQSService({
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development",
});

interface ValidationContext {
  objectInfo: ValidationMessageBody["objectInfo"];
  metadata: ValidationMessageBody["metadata"];
  contentLength?: number;
  maxSizeBytes: number;
}

/**
 * Calculate max size in bytes based on max size value and suffix
 */
function calculateMaxSizeBytes(maxSize: number, sizeSuffix: string): number {
  const multipliers: Record<string, number> = {
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024,
  };

  const multiplier = multipliers[sizeSuffix] ?? multipliers.MB;
  return maxSize * multiplier;
}

async function validateMaxFiles(context: ValidationContext): Promise<ValidationCheck> {
  const { metadata } = context;
  const isValid = metadata.uploadedFilesLength <= metadata.checklistItem.maxFiles;
  
  return {
    name: "maxFiles",
    passed: isValid,
    because: isValid 
      ? `File count within limit: ${metadata.uploadedFilesLength}/${metadata.checklistItem.maxFiles}`
      : `Maximum number of files exceeded: ${metadata.uploadedFilesLength}/${metadata.checklistItem.maxFiles}`,
  };
}

async function validateFileSize(context: ValidationContext): Promise<ValidationCheck> {
  const { contentLength, maxSizeBytes } = context;
  
  if (!contentLength) {
    return {
      name: "fileSize",
      passed: false,
      because: "Could not determine file size",
    };
  }

  const isValid = contentLength <= maxSizeBytes;
  const fileSizeMB = contentLength / (1024 * 1024);
  const maxSizeMB = maxSizeBytes / (1024 * 1024);

  return {
    name: "fileSize",
    passed: isValid,
    because: isValid
      ? `File size within limit: ${fileSizeMB.toFixed(2)} MB / ${maxSizeMB.toFixed(2)} MB`
      : `File size exceeds the maximum allowed: ${fileSizeMB.toFixed(2)} MB / ${maxSizeMB.toFixed(2)} MB`,
  };
}

async function validateMimeType(context: ValidationContext): Promise<ValidationCheck> {
  const { objectInfo, metadata } = context;
  
  if (!objectInfo.contentType) {
    return {
      name: "mimeType",
      passed: false,
      because: "Could not determine content type",
    };
  }

  // If no allowed types are specified or the array is empty, fail validation
  if (!metadata.checklistItem.allowedMimeTypes || metadata.checklistItem.allowedMimeTypes.length === 0) {
    return {
      name: "mimeType",
      passed: false,
      because: "No allowed MIME types specified",
    };
  }

  // Check if wildcard "*" is included, which allows all MIME types
  if (metadata.checklistItem.allowedMimeTypes.includes("*")) {
    return {
      name: "mimeType",
      passed: true,
      because: `File type accepted: ${objectInfo.contentType} (all types allowed)`,
    };
  }

  // Normal validation for specific MIME types
  const isValid = metadata.checklistItem.allowedMimeTypes.includes(objectInfo.contentType);

  return {
    name: "mimeType",
    passed: isValid,
    because: isValid
      ? `Valid file type: ${objectInfo.contentType}`
      : `Invalid file type: ${objectInfo.contentType}. Allowed types: ${metadata.checklistItem.allowedMimeTypes.join(", ")}`,
  };
}

/**
 * Process a single SQS record
 */
async function processRecord(
  record: SQSEvent["Records"][0],
  resultQueueUrl: string,
  targetBucket: string,
): Promise<void> {
  logger.log(`Processing SQS message: ${record.messageId}`);

  // Parse the message body from the validation gatherer step
  const messageBody: ValidationMessageBody = JSON.parse(
    record.body,
  ) as ValidationMessageBody;
  const { objectInfo: tempFileInfo, metadata: checklistMetadata, finalFileName } = messageBody;

  logger.log(
    `Validating temp file: ${tempFileInfo.key} against checklist item: ${checklistMetadata.checklistItem.title}`,
  );

  try {
    // Get detailed object information about the temp file
    const { ContentLength } = await s3Service.getObjectMetadata(
      tempFileInfo.bucket,
      tempFileInfo.key,
    );

    // Prepare validation context
    const maxSizeBytes = calculateMaxSizeBytes(
      checklistMetadata.checklistItem.maxSize,
      checklistMetadata.checklistItem.sizeSuffix,
    );

    const context: ValidationContext = {
      objectInfo: tempFileInfo,
      metadata: checklistMetadata,
      contentLength: ContentLength,
      maxSizeBytes,
    };

    // Run all validations
    const validationChecks = await Promise.all([
      validateMaxFiles(context),
      validateFileSize(context),
      validateMimeType(context),
    ]);

    // Determine if all validations passed
    const isValid = validationChecks.every((check: ValidationCheck) => check.passed);

    // Create validation result
    const validationResult: ValidationResult = {
      isValid,
      errors: validationChecks
        .filter((check: ValidationCheck) => !check.passed)
        .map((check: ValidationCheck) => check.because),
      objectInfo: tempFileInfo,
      metadata: checklistMetadata,
      contentType: tempFileInfo.contentType,
      validationChecks,
    };

    // Track this to update if the file is moved successfully
    let finalFileInfo = { ...tempFileInfo };

    // If valid, move the object to the permanent bucket
    if (isValid) {
      logger.log(
        `Temp file ${tempFileInfo.key} passed validation. Moving to permanent bucket.`,
      );

      try {
        // Extract the path structure (folders) from the key, excluding the filename
        const keyParts = tempFileInfo.key.split('/');
        keyParts.pop(); // Remove the current filename
        const pathPrefix = keyParts.length > 0 ? `${keyParts.join('/')}/` : '';
        
        // Use the finalFileName from the input message if available, or generate a random name
        let permanentFileName;
        
        if (finalFileName) {
          permanentFileName = finalFileName;
          logger.log(`Using provided final name: ${permanentFileName}`);
        } else {
          // Fallback to the original random name generation
          const extension = tempFileInfo.name.split('.').pop() || '';
          const timestamp = Date.now();
          const randomString = faker.string.alphanumeric(8);
          permanentFileName = `file-${timestamp}-${randomString}.${extension}`;
          logger.log(`Generated random file name: ${permanentFileName}`);
        }
        
        // Create the new key with original path but permanent filename
        const permanentKey = `${pathPrefix}${permanentFileName}`;

        // Move the object from temp to permanent bucket
        await s3Service.moveToBucket(
          tempFileInfo.bucket,
          tempFileInfo.key,
          targetBucket,
          permanentKey
        );

        // Update object info to reflect its new permanent location
        finalFileInfo = {
          name: permanentFileName,
          key: permanentKey,
          bucket: targetBucket,
          size: tempFileInfo.size,
          etag: tempFileInfo.etag,
          contentType: tempFileInfo.contentType,
        };
        
        // Update the validation result to use the permanent file info
        validationResult.objectInfo = finalFileInfo;
        
        logger.log(
          `Successfully moved temp file to permanent location: ${finalFileInfo.key}`,
        );
      } catch (moveError) {
        if (moveError instanceof Error) {
          throw new S3OperationException("move", moveError);
        }
        throw new S3OperationException("move", String(moveError));
      }
    } else {
      logger.warn(
        `Temp file ${tempFileInfo.key} failed validation with errors: ${validationResult.errors.join("; ")}`,
      );
    }

    // Send message with validation result
    const resultMessageBody: ValidationResultMessageBody = {
      name: finalFileInfo.name,
      objectInfo: finalFileInfo,
      metadata: checklistMetadata,
      validationResult,
      finalFileName,
    };

    try {
      // Add metadata as message attributes to help with DLQ processing
      const messageAttributes = {
        processingStage: {
          DataType: "String",
          StringValue: ProcessingStage.VALIDATION_PROCESSING
        },
        validationStatus: {
          DataType: "String",
          StringValue: validationResult.isValid ? "valid" : "invalid"
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
      
      logger.log(`Sending validation result to queue: ${resultQueueUrl}`);
      await sqsService.sendMessage(resultQueueUrl, resultMessageBody, messageAttributes);
      logger.log(`Validation complete for ${isValid ? 'permanent' : 'temp'} file: ${finalFileInfo.key}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new SQSOperationException("send", error);
      }
      throw new SQSOperationException("send", String(error));
    }
  } catch (error) {
    logger.error(
      `Error processing temp file ${tempFileInfo.key}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    if (error instanceof Error) {
      if (error.name === "S3OperationException" || error.name === "SQSOperationException") {
        throw error;
      }
      throw new FileValidationException(
        `Error validating file ${tempFileInfo.key}: ${error.message}`
      );
    }
    throw new FileValidationException(
      `Error validating file ${tempFileInfo.key}: ${String(error)}`
    );
  }
}

/**
 * Lambda handler - Triggered by a message from SQS with validation data
 * Validates the object and sends the result to the next queue
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.debug(`Event: ${JSON.stringify(event)}`);

  try {
    logger.log(
      `ObjectValidationProcessor lambda invoked with ${event.Records.length} messages`,
    );

    const resultQueueUrl = process.env.VALIDATION_RESULT_QUEUE_URL ?? "";
    if (!resultQueueUrl) {
      throw new MissingEnvironmentVariableException("VALIDATION_RESULT_QUEUE_URL");
    }

    const targetBucket = process.env.PERM_BUCKET_NAME ?? "";
    if (!targetBucket) {
      throw new MissingEnvironmentVariableException("PERM_BUCKET_NAME");
    }

    // Process each SQS message
    for (const record of event.Records) {
      await processRecord(record, resultQueueUrl, targetBucket);
    }

    logger.log("Validation processing complete");
  } catch (error) {
    logger.error(
      `Error in ObjectValidationProcessor: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    logger.error(
      `Stack: ${error instanceof Error ? error.stack : "No stack available"}`,
    );
    throw error;
  }
}; 