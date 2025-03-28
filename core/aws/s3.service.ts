import { Readable } from "node:stream";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
  waitUntilObjectExists,
} from "@aws-sdk/client-s3";

import { Logger } from "../shared/logger";

interface S3ServiceConfig {
  region?: string;
  endpoint?: string;
  isLocal?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export class S3Service {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger("S3Service");

  constructor(config: S3ServiceConfig = {}) {
    this.s3Client = this.createS3Client(config);
  }

  private createS3Client(config: S3ServiceConfig): S3Client {
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
          maxAttempts: 3,
        };

    return new S3Client(clientConfig);
  }

  async getObject(
    bucket: string,
    key: string,
  ): Promise<{ Body: Readable; ContentType?: string; ContentLength?: number }> {
    try {
      this.logger.log(`Retrieving object from bucket ${bucket}, key: ${key}`);

      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );

      if (!response.Body) {
        throw new Error(`Failed to retrieve object from bucket ${bucket}`);
      }

      // Convert the body to a Readable stream for Node.js
      const readableStream = response.Body as Readable;

      return {
        Body: readableStream,
        ContentType: response.ContentType,
        ContentLength: response.ContentLength,
      };
    } catch (error) {
      if (error instanceof S3ServiceException) {
        this.logger.error(
          `S3 error retrieving object: ${error.name} - ${error.message}`,
        );
      } else {
        this.logger.error(
          `Error retrieving object: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw error;
    }
  }

  async putObject(
    bucket: string,
    key: string,
    body: Buffer | Readable,
    contentType?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Putting object to bucket ${bucket}, key: ${key}`);

      const putObjectParams = {
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      };

      await this.s3Client.send(new PutObjectCommand(putObjectParams));
      this.logger.log(`Successfully uploaded object to ${bucket}/${key}`);
    } catch (error) {
      if (error instanceof S3ServiceException) {
        this.logger.error(
          `S3 error putting object: ${error.name} - ${error.message}`,
        );
      } else {
        this.logger.error(
          `Error putting object: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw error;
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    try {
      this.logger.log(`Deleting object from bucket ${bucket}, key: ${key}`);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
      this.logger.log(`Successfully deleted object from ${bucket}/${key}`);
    } catch (error) {
      if (error instanceof S3ServiceException) {
        this.logger.error(
          `S3 error deleting object: ${error.name} - ${error.message}`,
        );
      } else {
        this.logger.error(
          `Error deleting object: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      throw error;
    }
  }

  async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => {
        resolve(Buffer.concat(chunks));
      });
    });
  }

  async getObjectMetadata(
    bucket: string,
    key: string,
  ): Promise<HeadObjectCommandOutput> {
    try {
      this.logger.log(`Getting metadata for object ${bucket}/${key}`);
      const response = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: key }),
      );
      this.logger.log(`Successfully retrieved metadata for ${bucket}/${key}`);
      return response;
    } catch (error) {
      this.logger.error(
        `Error getting object metadata: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  async moveToBucket(
    sourceBucket: string,
    sourceKey: string,
    destinationBucket: string,
    destinationKey?: string,
  ): Promise<void> {
    const finalDestinationKey = destinationKey ?? sourceKey;
    this.logger.log(
      `Moving object from ${sourceBucket}/${sourceKey} to ${destinationBucket}/${finalDestinationKey}`,
    );

    try {
      // 1. Copy the object using CopyObjectCommand
      await this.s3Client.send(
        new CopyObjectCommand({
          CopySource: encodeURIComponent(`${sourceBucket}/${sourceKey}`),
          Bucket: destinationBucket,
          Key: finalDestinationKey,
        }),
      );

      // 2. Verify the object exists in the destination
      await waitUntilObjectExists(
        {
          client: this.s3Client,
          maxWaitTime: 30,
        },
        {
          Bucket: destinationBucket,
          Key: finalDestinationKey,
        },
      );

      this.logger.log(
        `Object copied successfully to ${destinationBucket}/${finalDestinationKey}`,
      );

      // 3. Delete the original object
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: sourceBucket,
          Key: sourceKey,
        }),
      );

      this.logger.log(
        `Original object deleted from ${sourceBucket}/${sourceKey}`,
      );
      this.logger.log("Move operation completed successfully");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to move object: ${errorMessage}`);

      // Try to clean up the destination object if created
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: destinationBucket,
            Key: finalDestinationKey,
          }),
        );
        this.logger.log("Cleaned up destination object after failed move");
      } catch {
        this.logger.warn(
          "Failed to clean up destination object after failed move",
        );
      }

      throw new Error(`Failed to move object: ${errorMessage}`);
    }
  }
} 