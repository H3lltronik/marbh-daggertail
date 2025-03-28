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
}

// Mensaje con los metadatos del checklist para validación
export interface ValidationMessageBody extends SQSMessageBody {
  metadata: ChecklistItemMetadata;
}

// Mensaje con el resultado de la validación
export interface ValidationResultMessageBody extends ValidationMessageBody {
  validationResult: ValidationResult;
} 