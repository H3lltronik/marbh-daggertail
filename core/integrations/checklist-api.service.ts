import { Logger } from "../shared/logger";
import { ChecklistItemMetadata } from "../shared/types";

interface ChecklistApiServiceConfig {
  apiKey?: string;
  baseUrl?: string;
}

export class ChecklistApiService {
  private readonly logger = new Logger("ChecklistApiService");
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: ChecklistApiServiceConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.CHECKLIST_API_KEY ?? "";
    this.baseUrl = config.baseUrl ?? process.env.WEBHOOK_CHECKLIST_DATA ?? "";
    
    // Log configuration for debugging
    this.logger.log(`ChecklistApiService initialized with base URL: ${this.baseUrl}`);
    if (!this.baseUrl) {
      this.logger.warn("WEBHOOK_CHECKLIST_DATA environment variable is not set or empty");
    }
  }

  async getAssignationFileMetadata(
    assignationFileId: string,
  ): Promise<ChecklistItemMetadata> {
    try {
      if (!this.baseUrl) {
        throw new Error("WEBHOOK_CHECKLIST_DATA not configured");
      }

      if (!this.apiKey) {
        throw new Error("CHECKLIST_API_KEY not configured");
      }

      this.logger.log(
        `Requesting metadata for assignation file ID: ${assignationFileId}`,
      );

      this.logger.debug(
        `Request: ${JSON.stringify({
          url: `${this.baseUrl}/${assignationFileId}`,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
        })}`,
      );

      const response = await fetch(`${this.baseUrl}/${assignationFileId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data: unknown = await response.json();

      if (!data) {
        throw new Error("No data received from checklist API");
      }

      const metadata = data as ChecklistItemMetadata;
      this.validateMetadata(metadata);

      this.logger.log(
        `Retrieved metadata for assignation file ID: ${assignationFileId}`,
      );
      this.logger.debug(`Metadata: ${JSON.stringify(metadata)}`);

      return metadata;
    } catch (error) {
      this.logger.error(
        `Error retrieving metadata for ID ${assignationFileId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private validateMetadata(
    metadata: unknown,
  ): asserts metadata is ChecklistItemMetadata {
    const data = metadata as Partial<ChecklistItemMetadata>;

    if (!data.checklistItem) {
      throw new Error("Missing checklistItem in metadata");
    }

    const requiredFields = [
      "uuid",
      "checklistItemId",
      "checklistItemType",
      "uploadedFilesLength",
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const requiredChecklistFields = [
      "title",
      "maxFiles",
      "maxSize",
      "sizeSuffix",
      "allowedMimeTypes",
    ];

    for (const field of requiredChecklistFields) {
      if (!(field in data.checklistItem)) {
        throw new Error(`Missing required field in checklistItem: ${field}`);
      }
    }
  }
} 