import { lookup } from "mime-types";
import { InvalidFileFormatException } from "../../core/shared/exceptions";
import { S3ObjectInfo } from "../../core/shared/types";

/**
 * Interface for parsed filename components
 */
export interface ParsedFilename {
  tempFileInfo: S3ObjectInfo;
  desiredFileName: string;
  uploadedAssignationFileId: string;
  extension: string;
  finalFileName: string;
}

/**
 * Parse a filename from S3 with format {finalFileName}__{assignationFileUploadUuid}.extension
 */
export function parseFilename(
  tempBucket: string, 
  tempKey: string, 
  size: number, 
  etag: string
): ParsedFilename {
  const tempFileName = tempKey.split("/").pop() ?? tempKey;

  // Regex to match {finalFileName}__{assignationFileUploadUuid}.extension format
  const regex = /(.+)__([^_]+)\.([^.]+)$/;
  const match = tempFileName.match(regex);

  if (!match) {
    throw new InvalidFileFormatException(
      `File name ${tempFileName} doesn't match expected format: {finalFileName}__{assignationFileUploadUuid}.extension`
    );
  }

  const desiredFileName = match[1];
  const uploadedAssignationFileId = match[2];
  const extension = match[3];
  
  const mimeType = (lookup(tempFileName) ?? "invalid") as string;

  // Information about the temporary file in S3
  const tempFileInfo: S3ObjectInfo = {
    name: tempFileName,
    bucket: tempBucket,
    key: tempKey,
    size: size,
    etag: etag,
    contentType: mimeType,
  };

  return {
    tempFileInfo,
    desiredFileName,
    uploadedAssignationFileId,
    extension,
    finalFileName: `${desiredFileName}.${extension}`
  };
} 