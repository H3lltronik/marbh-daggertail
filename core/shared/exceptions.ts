export class LambdaBaseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class LambdaInitializationException extends LambdaBaseException {
  constructor(service?: string) {
    super(
      `Failed to initialize lambda services${service ? `: ${service}` : ""}`,
    );
  }
}

export class MissingEnvironmentVariableException extends LambdaBaseException {
  constructor(variable: string) {
    super(`${variable} environment variable is not set`);
  }
}

export class InvalidFileFormatException extends LambdaBaseException {
  constructor(filename: string) {
    super(`Invalid filename format: ${filename}`);
  }
}

export class FileValidationException extends LambdaBaseException {}

export class S3OperationException extends LambdaBaseException {
  constructor(operation: string, error: Error | string) {
    super(
      `Failed to perform S3 ${operation}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export class WebhookException extends LambdaBaseException {
  constructor(error: Error | string) {
    super(
      `Failed to send webhook: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export class SQSOperationException extends LambdaBaseException {
  constructor(operation: string, error: Error | string) {
    super(
      `Failed to perform SQS ${operation}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

export class DLQProcessingException extends LambdaBaseException {
  constructor(stage: string, error: Error | string) {
    super(
      `Failed to process DLQ message from stage ${stage}: ${error instanceof Error ? error.message : error}`,
    );
  }
} 