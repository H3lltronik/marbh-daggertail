import { S3Event } from "aws-lambda";
import { lookup } from "mime-types";

import { S3Service } from "../../core/aws/s3.service";
import { SQSService } from "../../core/aws/sqs.service";
import { Logger } from "../../core/shared/logger";
import {
  FileIdExtractionMessageBody,
  S3ObjectInfo,
} from "../../core/shared/types";
import {
  InvalidFileFormatException,
  MissingEnvironmentVariableException,
  SQSOperationException,
} from "../../core/shared/exceptions";

// Initialize services
const logger = new Logger("BucketFileIdExtractor");
const s3Service = new S3Service({
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development",
});
const sqsService = new SQSService({ 
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development"
});

/**
 * Process a single S3 record
 */
async function processS3Record(
  record: S3Event["Records"][0],
  queueUrl: string
): Promise<void> {
  const sourceBucket = record.s3.bucket.name;
  const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const fileName = sourceKey.split("/").pop() ?? sourceKey;

  const regex = /.*-\{([^}]+)\}\.[^.]+$/;
  const match = fileName.match(regex);

  if (!match?.[1]) {
    throw new InvalidFileFormatException(fileName);
  }

  const mimeType = (lookup(fileName) ?? "invalid") as string;

  const uploadedAssignationFileId = match[1];
  const objectInfo: S3ObjectInfo = {
    name: fileName,
    bucket: sourceBucket,
    key: sourceKey,
    size: record.s3.object.size,
    etag: record.s3.object.eTag,
    contentType: mimeType,
  };

  const messageBody: FileIdExtractionMessageBody = {
    name: fileName,
    objectInfo,
    uploadedAssignationFileId,
  };

  try {
    await sqsService.sendMessage(queueUrl, messageBody);
    logger.log(`Processed ${fileName}`);
  } catch (error) {
    if (error instanceof Error) {
      throw new SQSOperationException("send", error);
    }
    throw new SQSOperationException("send", String(error));
  }
}

/**
 * Lambda handler - Triggered when an object is created in the temporary bucket
 * Extracts the ID from the filename and sends a message to SQS for the next lambda
 * to retrieve the checklist metadata
 */
export const handler = async (event: S3Event): Promise<void> => {
  logger.debug(`Event: ${JSON.stringify(event)}`);

  try {
    const queueUrl = process.env.FILE_ID_EXTRACTION_QUEUE_URL;
    if (!queueUrl) {
      throw new MissingEnvironmentVariableException(
        "FILE_ID_EXTRACTION_QUEUE_URL",
      );
    }

    await Promise.all(
      event.Records.map(record =>
        processS3Record(record, queueUrl),
      ),
    );
  } catch (error) {
    logger.error(
      `Error in handler: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}; 