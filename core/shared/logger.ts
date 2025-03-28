export class Logger {
  private readonly context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string): string {
    return `[${this.context}] ${message}`;
  }

  log(message: string | object): void {
    if (typeof message === "object") {
      console.log(this.formatMessage(JSON.stringify(message)));
    } else {
      console.log(this.formatMessage(message));
    }
  }

  error(message: string | object): void {
    if (typeof message === "object") {
      console.error(this.formatMessage(JSON.stringify(message)));
    } else {
      console.error(this.formatMessage(message));
    }
  }

  warn(message: string | object): void {
    if (typeof message === "object") {
      console.warn(this.formatMessage(JSON.stringify(message)));
    } else {
      console.warn(this.formatMessage(message));
    }
  }

  debug(message: string | object): void {
    if (process.env.DEBUG !== "true") {
      return;
    }

    if (typeof message === "object") {
      console.debug(this.formatMessage(JSON.stringify(message)));
    } else {
      console.debug(this.formatMessage(message));
    }
  }

  verbose(message: string | object): void {
    if (process.env.VERBOSE !== "true") {
      return;
    }

    if (typeof message === "object") {
      console.log(this.formatMessage(JSON.stringify(message)));
    } else {
      console.log(this.formatMessage(message));
    }
  }
} 