import { Logger } from "../shared/logger";
import { WebhookPayload } from "../shared/types";

interface WebhookServiceConfig {
  apiKey?: string;
}

export class WebhookService {
  private readonly logger = new Logger("WebhookService");
  private readonly apiKey: string;

  constructor(config: WebhookServiceConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.CHECKLIST_API_KEY ?? "";
  }

  async sendWebhook(
    webhookUrl: string,
    payload: WebhookPayload | Record<string, unknown>,
  ): Promise<void> {
    try {
      this.logger.log(`Sending webhook to: ${webhookUrl}`);
      this.logger.debug(`Webhook payload: ${JSON.stringify(payload)}`);

      this.logger.debug(
        `Request: ${JSON.stringify({
          url: webhookUrl,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
        })}`,
      );

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const responseData: Record<string, unknown> = await response
        .json()
        .catch(() => ({}));

      this.logger.log(`Webhook sent successfully. Status: ${response.status}`);
      this.logger.debug(`Response data: ${JSON.stringify(responseData)}`);
    } catch (error) {
      this.logger.error(
        `Error sending webhook: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }
} 