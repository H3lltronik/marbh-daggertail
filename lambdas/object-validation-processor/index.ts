import { SQSEvent } from "aws-lambda";

import { S3Service } from "../../core/aws/s3.service";
import { SQSService } from "../../core/aws/sqs.service";
import { Logger } from "../../core/shared/logger";
import {
  ValidationMessageBody,
  ValidationResult,
  ValidationResultMessageBody,
  ValidationCheck,
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

  // Parse the message body
  const messageBody: ValidationMessageBody = JSON.parse(
    record.body,
  ) as ValidationMessageBody;
  const { objectInfo, metadata } = messageBody;

  logger.log(
    `Validating object: ${objectInfo.key} against checklist item: ${metadata.checklistItem.title}`,
  );

  try {
    // Get detailed object information
    const { ContentLength } = await s3Service.getObjectMetadata(
      objectInfo.bucket,
      objectInfo.key,
    );

    // Prepare validation context
    const maxSizeBytes = calculateMaxSizeBytes(
      metadata.checklistItem.maxSize,
      metadata.checklistItem.sizeSuffix,
    );

    const context: ValidationContext = {
      objectInfo,
      metadata,
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
      objectInfo,
      metadata,
      contentType: objectInfo.contentType,
      validationChecks,
    };

    // If valid, move the object to the permanent bucket
    if (isValid) {
      logger.log(
        `Object ${objectInfo.key} passed validation. Moving to permanent bucket.`,
      );

      try {
        // Get file extension from the original name
        const extension = objectInfo.name.split('.').pop() || '';
        
        // Extract the path structure (folders) from the key, excluding the filename
        const keyParts = objectInfo.key.split('/');
        const fileName = keyParts.pop() || '';
        const pathPrefix = keyParts.length > 0 ? `${keyParts.join('/')}/` : '';
        
        // Generate a new filename with a timestamp and random string to ensure uniqueness
        // Avoid special characters that might cause issues with S3 keys
        const timestamp = Date.now();
        const randomString = faker.string.alphanumeric(8); // Use alphanumeric only
        const newFileName = `file-${timestamp}-${randomString}.${extension}`;
        
        // Create the new key with original path but new filename
        const newKey = `${pathPrefix}${newFileName}`;

        // Move the object with the new key
        await s3Service.moveToBucket(
          objectInfo.bucket,
          objectInfo.key,
          targetBucket,
          newKey
        );

        // Update object info to reflect its new location and name
        objectInfo.key = newKey;
        objectInfo.name = newFileName;
        objectInfo.bucket = targetBucket;
        
        logger.log(
          `Successfully moved object ${objectInfo.key} to permanent bucket ${targetBucket}`,
        );
      } catch (moveError) {
        if (moveError instanceof Error) {
          throw new S3OperationException("move", moveError);
        }
        throw new S3OperationException("move", String(moveError));
      }
    } else {
      logger.warn(
        `Object ${objectInfo.key} failed validation with errors: ${validationResult.errors.join("; ")}`,
      );
    }

    // Send message with validation result
    const resultMessageBody: ValidationResultMessageBody = {
      name: objectInfo.name,
      objectInfo,
      metadata,
      validationResult,
    };

    try {
      logger.log(`Sending validation result to queue: ${resultQueueUrl}`);
      await sqsService.sendMessage(resultQueueUrl, resultMessageBody);
      logger.log(`Validation complete for object: ${objectInfo.key}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new SQSOperationException("send", error);
      }
      throw new SQSOperationException("send", String(error));
    }
  } catch (error) {
    logger.error(
      `Error processing object ${objectInfo.key}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    if (error instanceof Error) {
      if (error.name === "S3OperationException" || error.name === "SQSOperationException") {
        throw error;
      }
      throw new FileValidationException(
        `Error validating file ${objectInfo.key}: ${error.message}`
      );
    }
    throw new FileValidationException(
      `Error validating file ${objectInfo.key}: ${String(error)}`
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