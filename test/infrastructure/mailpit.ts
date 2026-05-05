import axios, { AxiosInstance } from 'axios';

export interface MailpitMessage {
  ID: string;
  From: { Address: string; Name: string };
  To: Array<{ Address: string; Name: string }>;
  Subject: string;
  Created: string;
  Read: boolean;
  Size: number;
  AttachmentCount: number;
  Tags: string[];
  MessageID: string;
  InReplyTo: string;
  Date: string;
  Text: string;
  HTML: string;
  ContentType: string;
  ContentID: string;
  Priority: number;
  Sniffed: boolean;
  Score: number;
  DkimSignature: string;
  SpamScore: number;
  Hash: string;
  Ephemeral: boolean;
}

export interface MailpitSummary {
  start: number;
  end: number;
  count: number;
  total: number;
  unread: number;
  messages: MailpitMessage[];
}

export interface MailpitMessageDetail extends MailpitMessage {
  From: { Address: string; Name: string; Domain: string };
  To: Array<{ Address: string; Name: string; Domain: string }>;
  Cc: Array<{ Address: string; Name: string; Domain: string }>;
  Bcc: Array<{ Address: string; Name: string; Domain: string }>;
  ReplyTo: Array<{ Address: string; Name: string; Domain: string }>;
  ReturnPath: string;
  Date: string;
  MessageID: string;
  InReplyTo: string;
  References: string;
  Subject: string;
  Size: number;
  AttachmentCount: number;
  Read: boolean;
  Deleted: boolean;
  Sniffed: boolean;
  Score: number;
  SpamScore: number;
  DkimSignature: string;
  Hash: string;
  Ephemeral: boolean;
  Tags: string[];
  ContentType: string;
  ContentID: string;
  MIME: {
    Parts: Array<{
      ContentType: string;
      ContentID: string;
      FileName: string;
      ContentLength: number;
      PartID: number;
      Headers: Record<string, string>;
    }>;
  };
  Text: string;
  HTML: string;
  Inline: string[];
  Attachments: Array<{
    ContentType: string;
    FileName: string;
    ContentLength: number;
    PartID: number;
    ContentID: string;
  }>;
}

export class MailpitHelper {
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    // Use provided baseUrl or construct from environment variables
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else {
      const host = process.env.MAILPIT_HOST || 'localhost';
      const port = process.env.MAILPIT_UI_PORT || '8025';
      const secure = process.env.MAILPIT_SECURE === 'true';
      const protocol = secure ? 'https' : 'http';
      this.baseUrl = `${protocol}://${host}:${port}`;
    }

    this.client = axios.create({
      baseURL: `${this.baseUrl}/api/v1`,
      timeout: 10000,
    });
  }

  /**
   * Get all messages from the inbox
   */
  async getMessages(): Promise<MailpitSummary> {
    try {
      const response = await this.client.get<MailpitSummary>('/messages');
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all messages from the inbox
   */
  async clearMessages(): Promise<void> {
    try {
      await this.client.delete('/messages');
    } catch (error) {
      throw new Error(`Failed to clear messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get detailed message information by ID
   */
  async getMessage(id: string): Promise<MailpitMessageDetail> {
    try {
      const response = await this.client.get<MailpitMessageDetail>(`/message/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get message ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Download message attachment
   */
  async getAttachment(messageId: string, partId: number): Promise<Buffer> {
    try {
      const response = await this.client.get(`/message/${messageId}/part/${partId}`, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new Error(`Failed to get attachment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Poll for an email that matches the given predicate
   */
  async waitForEmail(predicate: (message: MailpitMessage) => boolean, timeout: number = 5000, pollInterval: number = 300): Promise<MailpitMessage> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const messages = await this.getMessages();
        const matchingMessage = messages.messages.find(predicate);

        if (matchingMessage) {
          return matchingMessage;
        }
      } catch {
        // Continue polling even if there's an error
      }

      // Wait for the poll interval
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Email not found within ${timeout}ms timeout`);
  }

  /**
   * Wait for an email by recipient address
   */
  async waitForEmailTo(recipient: string, timeout: number = 5000): Promise<MailpitMessage> {
    return this.waitForEmail((message) => message.To.some((to) => to.Address === recipient), timeout);
  }

  /**
   * Wait for an email by subject containing specific text
   */
  async waitForEmailWithSubject(subjectContains: string, timeout: number = 5000): Promise<MailpitMessage> {
    return this.waitForEmail((message) => message.Subject.includes(subjectContains), timeout);
  }

  /**
   * Wait for an email by recipient and subject
   */
  async waitForEmailToWithSubject(recipient: string, subjectContains: string, timeout: number = 5000): Promise<MailpitMessage> {
    return this.waitForEmail((message) => message.To.some((to) => to.Address === recipient) && message.Subject.includes(subjectContains), timeout);
  }

  /**
   * Generate a unique test identifier for email subjects
   */
  static generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Check if Mailpit is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.client.get('/messages');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup method to close connections properly
   */
  cleanup(): void {
    // Force close all connections by destroying the axios instance
    // This helps prevent Jest open handle warnings
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = this.client as any;
      if (client.httpAgent?.destroy) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        client.httpAgent.destroy();
      }
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export a default instance for convenience
export const mailpitHelper = new MailpitHelper();
