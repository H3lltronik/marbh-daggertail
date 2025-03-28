import { WebhookService } from "../../core/integrations/webhook.service";
import { Logger } from "../../core/shared/logger";
import { S3ObjectInfo, ValidationCheck, ValidationResult, WebhookPayload } from "../../core/shared/types";
import { WebhookException } from "../../core/shared/exceptions";

const logger = new Logger("WebhookSender");
const webhookService = new WebhookService();

/**
 * Success payload for the validation webhook
 */
interface SuccessPayload extends Record<string, unknown> {
  uuid: string;
  name: string;
  url: string;
  size?: number;
  mimetype?: string;
}

/**
 * Error payload for the validation webhook
 */
interface ErrorPayload extends Record<string, unknown> {
  uuid: string;
  error: string;
  validationDetails: string[];
  processingError?: boolean;
}

/**
 * Send success webhook
 */
export async function sendSuccessWebhook(
  fileInfo: S3ObjectInfo,
  validationResult: ValidationResult,
  webhookUrl: string
): Promise<void> {
  const uuid = validationResult.metadata.uuid;
  
  const successPayload: SuccessPayload = {
    uuid,
    name: fileInfo.name,
    url: `https://${fileInfo.bucket}.s3.amazonaws.com/${fileInfo.key}`,
    size: fileInfo.size,
    mimetype: validationResult.contentType,
  };

  logger.log(`Sending success webhook to: ${webhookUrl}`);
  await webhookService.sendWebhook(webhookUrl, successPayload);
  logger.log(`Successfully sent success webhook for file: ${fileInfo.key}`);
}

/**
 * Send error webhook
 */
export async function sendErrorWebhook(
  validationResult: ValidationResult,
  isFromDlq: boolean,
  errorMessage: string,
  webhookUrl: string
): Promise<void> {
  const uuid = validationResult.metadata.uuid;
  
  // Get failed validation checks
  const failedChecks = validationResult.validationChecks
    .filter((check: ValidationCheck) => !check.passed)
    .map((check: ValidationCheck) => check.because);
  
  const errorPayload: ErrorPayload = {
    uuid,
    error: errorMessage,
    validationDetails: failedChecks,
    // Include processing error flag if from DLQ
    processingError: isFromDlq
  };

  logger.log(`Sending error webhook to: ${webhookUrl}`);
  await webhookService.sendWebhook(webhookUrl, errorPayload);
  logger.log(`Successfully sent error webhook for file with UUID: ${uuid}`);
}

/**
 * Send appropriate webhook based on validation result
 */
export async function sendWebhook(
  fileInfo: S3ObjectInfo,
  validationResult: ValidationResult,
  isFromDlq: boolean,
  errorMessage: string,
  webhookSuccessUrl: string,
  webhookErrorUrl: string
): Promise<void> {
  try {
    if (validationResult.isValid) {
      await sendSuccessWebhook(fileInfo, validationResult, webhookSuccessUrl);
    } else {
      await sendErrorWebhook(
        validationResult,
        isFromDlq,
        errorMessage,
        webhookErrorUrl
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new WebhookException(error);
    }
    throw new WebhookException(String(error));
  }
} 