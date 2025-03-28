import { S3Event } from "aws-lambda";
import { parseFilename } from "./filename-parser";
import { sendExtractionMessage } from "./message-sender";

/**
 * Process a single S3 record
 */
export async function processS3Record(
  record: S3Event["Records"][0],
  queueUrl: string
): Promise<void> {
  const tempBucket = record.s3.bucket.name;
  const tempKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, " "));
  const size = record.s3.object.size;
  const etag = record.s3.object.eTag;

  // Parse the filename to extract components
  const parsedFile = parseFilename(tempBucket, tempKey, size, etag);
  
  // Send message to the next processing step
  await sendExtractionMessage(parsedFile, queueUrl);
} 