import { Logger } from "../../core/shared/logger";
import {
  ChecklistItemMetadata,
  FileIdExtractionMessageBody,
  ProcessingStage,
  S3ObjectInfo,
  ValidationMessageBody,
} from "../../core/shared/types";
import { DLQProcessingException } from "../../core/shared/exceptions";

const logger = new Logger("DLQMessageExtractor");

/**
 * Extracted data from the DLQ message
 */
export interface ExtractedMessageData {
  fileInfo: S3ObjectInfo;
  finalFileName?: string;
  assignationId?: string;
  metadata?: ChecklistItemMetadata;
}

/**
 * Extract data from the original message based on the processing stage
 */
export function extractMessageData(
  messageBody: string,
  stage: ProcessingStage
): ExtractedMessageData {
  try {
    switch (stage) {
      case ProcessingStage.FILE_ID_EXTRACTION: {
        // At this stage, we only have the temp file info and the uploaded file ID extracted from the filename
        const parsedMessage = JSON.parse(messageBody) as FileIdExtractionMessageBody;
        return { 
          fileInfo: parsedMessage.objectInfo,
          finalFileName: parsedMessage.finalFileName,
          assignationId: parsedMessage.uploadedAssignationFileId
        };
      }
      
      case ProcessingStage.VALIDATION_GATHERING: {
        // At this stage, we might or might not have checklist metadata
        // The failure could be before or after retrieving the metadata
        const parsedMessage = JSON.parse(messageBody) as ValidationMessageBody;
        return { 
          fileInfo: parsedMessage.objectInfo,
          finalFileName: parsedMessage.finalFileName,
          metadata: parsedMessage.metadata // This may or may not exist depending on where it failed
        };
      }
      
      case ProcessingStage.VALIDATION_PROCESSING:
      case ProcessingStage.VALIDATION_RESULT: {
        // At these stages, we have all the data including checklist metadata
        const parsedMessage = JSON.parse(messageBody) as ValidationMessageBody;
        return { 
          fileInfo: parsedMessage.objectInfo,
          finalFileName: parsedMessage.finalFileName,
          metadata: parsedMessage.metadata,
          assignationId: parsedMessage.metadata?.uuid
        };
      }
      
      default:
        throw new Error(`Unknown processing stage: ${stage}`);
    }
  } catch (error) {
    logger.error(`Error extracting message data: ${error instanceof Error ? error.message : String(error)}`);
    throw new DLQProcessingException(stage, `Failed to parse original message: ${error instanceof Error ? error.message : String(error)}`);
  }
} 