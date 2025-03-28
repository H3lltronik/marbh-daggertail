import { SQSService } from "../../core/aws/sqs.service";
import { Logger } from "../../core/shared/logger";
import { FileIdExtractionMessageBody, ProcessingStage } from "../../core/shared/types";
import { SQSOperationException } from "../../core/shared/exceptions";
import { ParsedFilename } from "./filename-parser";

// Initialize services
const logger = new Logger("MessageSender");
const sqsService = new SQSService({ 
  isLocal: process.env.IS_LOCAL === "true" || process.env.NODE_ENV === "development"
});

/**
 * Send a message to the SQS queue with the extracted file information
 */
export async function sendExtractionMessage(
  parsedFile: ParsedFilename,
  queueUrl: string
): Promise<void> {
  const { tempFileInfo, uploadedAssignationFileId, finalFileName } = parsedFile;
  
  const messageBody: FileIdExtractionMessageBody = {
    name: tempFileInfo.name,
    objectInfo: tempFileInfo,
    uploadedAssignationFileId,
    finalFileName,
  };

  try {
    // Add metadata as message attributes to help with DLQ processing
    const messageAttributes = {
      processingStage: {
        DataType: "String",
        StringValue: ProcessingStage.FILE_ID_EXTRACTION
      },
      assignationId: {
        DataType: "String",
        StringValue: uploadedAssignationFileId
      },
      timestamp: {
        DataType: "String",
        StringValue: new Date().toISOString()
      }
    };

    await sqsService.sendMessage(queueUrl, messageBody, messageAttributes);
    logger.log(
      `Processed temp file ${tempFileInfo.name}: ` + 
      `desiredFileName=${parsedFile.desiredFileName}, ` +
      `uuid=${uploadedAssignationFileId}`
    );
  } catch (error) {
    if (error instanceof Error) {
      throw new SQSOperationException("send", error);
    }
    throw new SQSOperationException("send", String(error));
  }
} 