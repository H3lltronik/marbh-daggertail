import { S3Event } from "aws-lambda";
import { Logger } from "../../core/shared/logger";
import { MissingEnvironmentVariableException } from "../../core/shared/exceptions";
import { processS3Record } from "./record-processor";

// Initialize logger
const logger = new Logger("BucketFileIdExtractor");

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