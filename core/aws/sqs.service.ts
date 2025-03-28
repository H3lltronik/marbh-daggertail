import {
  SendMessageCommand,
  SQSClient,
  SQSServiceException,
  MessageAttributeValue,
} from "@aws-sdk/client-sqs";

import { Logger } from "../shared/logger";

interface SQSServiceConfig {
  region?: string;
  endpoint?: string;
  isLocal?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface SQSMessageAttributes {
  [key: string]: {
    DataType: string;
    StringValue?: string;
    BinaryValue?: Uint8Array;
  };
}

export class SQSService {
  private readonly sqsClient: SQSClient;
  private readonly logger = new Logger("SQSService");

  constructor(config: SQSServiceConfig = {}) {
    this.sqsClient = this.createSQSClient(config);
  }

  private createSQSClient(config: SQSServiceConfig): SQSClient {
    const { isLocal, region, endpoint, accessKeyId, secretAccessKey } = config;

    const clientConfig = isLocal
      ? {
          endpoint: endpoint ?? "http://localhost:4566",
          forcePathStyle: true,
          region: region ?? "us-east-1",
          credentials: {
            accessKeyId: accessKeyId ?? "test",
            secretAccessKey: secretAccessKey ?? "test",
          },
        }
      : {
          region: region ?? process.env.AWS_REGION ?? "us-east-1",
          maxAttempts: 3, // Automatic retries
        };

    return new SQSClient(clientConfig);
  }

  async sendMessage<T>(
    queueUrl: string, 
    messageBody: T, 
    messageAttributes?: SQSMessageAttributes
  ): Promise<string> {
    try {
      this.logger.log(`Sending message to SQS queue: ${queueUrl}`);
      this.logger.debug(`Message body: ${JSON.stringify(messageBody)}`);
      
      if (messageAttributes) {
        this.logger.debug(`Message attributes: ${JSON.stringify(messageAttributes)}`);
      }

      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: messageAttributes as Record<string, MessageAttributeValue>,
      });

      const result = await this.sqsClient.send(command);

      if (!result.MessageId) {
        throw new Error("Failed to send message to SQS: No MessageId returned");
      }

      this.logger.log(`Message sent with ID: ${result.MessageId}`);
      return result.MessageId;
    } catch (error) {
      if (error instanceof SQSServiceException) {
        this.logger.error(
          `SQS error sending message: ${error.name} - ${error.message}`,
        );
      } else {
        this.logger.error(
          `Error sending message: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw error;
    }
  }
} 