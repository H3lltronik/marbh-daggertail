export interface S3ObjectInfo {
  name: string;
  bucket: string;
  key: string;
  size?: number;
  lastModified?: string;
  etag?: string;
  contentType?: string;
}

export interface SQSMessageBody {
  name: string;
  objectInfo: S3ObjectInfo;
}

export interface WebhookPayload {
  name: string;
  objectInfo: S3ObjectInfo;
  processedAt: string;
}

// Dead Letter Queue processing types
export enum ProcessingStage {
  FILE_ID_EXTRACTION = "file_id_extraction",
  VALIDATION_GATHERING = "validation_gathering",
  VALIDATION_PROCESSING = "validation_processing",
  VALIDATION_RESULT = "validation_result"
}

export interface DLQMessageMetadata {
  stage: ProcessingStage;
  errorType: string;
  errorMessage: string;
  retryCount: number;
  originalMessageId?: string;
  timestamp: string;
}

export interface DLQMessageBody extends SQSMessageBody {
  metadata: DLQMessageMetadata;
  originalMessage: string; // Stringified original message
}

// New types for the validation process

export interface ChecklistItem {
  uuid: string;
  title: string;
  description: string;
  maxFiles: number;
  minFiles: number;
  maxSize: number;
  sizeSuffix: string;
  allowedMimeTypes: string[];
}

export interface ChecklistItemMetadata {
  uuid: string;
  checklistItemType: "CHECKLIST_ITEM" | "EXTRA_CHECKLIST_ITEM";
  checklistItemId: number;
  checklistItem: ChecklistItem;
  uploadedFilesLength: number;
}

export interface ValidationCheck {
  name: string;
  passed: boolean;
  because: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  objectInfo: S3ObjectInfo;
  metadata: ChecklistItemMetadata;
  contentType?: string;
  validationChecks: ValidationCheck[];
}

// Mensaje inicial con la referencia del objeto S3 y el ID extraído del nombre de archivo
export interface FileIdExtractionMessageBody extends SQSMessageBody {
  uploadedAssignationFileId: string;
  finalFileName: string;
}

// Mensaje con los metadatos del checklist para validación
export interface ValidationMessageBody extends SQSMessageBody {
  metadata: ChecklistItemMetadata;
  finalFileName?: string;
}

// Mensaje con el resultado de la validación
export interface ValidationResultMessageBody extends ValidationMessageBody {
  validationResult: ValidationResult;
} 