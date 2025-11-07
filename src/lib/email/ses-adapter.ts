/**
 * AWS SES Email Adapter
 *
 * Implements email sending using AWS Simple Email Service (SES)
 */

import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import type { IEmailAdapter, EmailMessage, EmailSendResult } from './types';

export class SESAdapter implements IEmailAdapter {
  private client: SESClient | null = null;
  private configured: boolean = false;

  constructor() {
    const region = process.env.AWS_REGION || process.env.AWS_SES_REGION;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (region && accessKeyId && secretAccessKey) {
      this.client = new SESClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
      this.configured = true;
    }
  }

  getName(): string {
    return 'AWS SES';
  }

  isConfigured(): boolean {
    return this.configured && this.client !== null;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isConfigured() || !this.client) {
      return {
        success: false,
        error: 'AWS SES adapter not configured. Missing AWS credentials or region.',
      };
    }

    try {
      // Build raw MIME email
      const rawEmail = this.buildRawEmail(message);

      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawEmail),
        },
      });

      const response = await this.client.send(command);

      return {
        success: true,
        messageId: response.MessageId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SESAdapter] Send failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build raw MIME email message
   */
  private buildRawEmail(message: EmailMessage): string {
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36)}`;
    const fromName = message.from.name
      ? `"${message.from.name}" <${message.from.email}>`
      : message.from.email;

    let rawEmail = '';

    // Headers
    rawEmail += `From: ${fromName}\r\n`;
    rawEmail += `To: ${message.to}\r\n`;
    if (message.replyTo) {
      rawEmail += `Reply-To: ${message.replyTo}\r\n`;
    }
    rawEmail += `Subject: ${message.subject}\r\n`;
    rawEmail += 'MIME-Version: 1.0\r\n';

    // Custom headers
    if (message.headers) {
      for (const [key, value] of Object.entries(message.headers)) {
        rawEmail += `${key}: ${value}\r\n`;
      }
    }

    // Content type
    if (message.attachments && message.attachments.length > 0) {
      rawEmail += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;

      // HTML body part
      rawEmail += `--${boundary}\r\n`;
      rawEmail += 'Content-Type: text/html; charset=UTF-8\r\n';
      rawEmail += 'Content-Transfer-Encoding: 7bit\r\n\r\n';
      rawEmail += `${message.html}\r\n\r\n`;

      // Attachments
      for (const attachment of message.attachments) {
        rawEmail += `--${boundary}\r\n`;
        rawEmail += `Content-Type: ${attachment.type}; name="${attachment.filename}"\r\n`;
        rawEmail += `Content-Disposition: ${attachment.disposition}; filename="${attachment.filename}"\r\n`;
        rawEmail += 'Content-Transfer-Encoding: base64\r\n\r\n';
        rawEmail += `${attachment.content}\r\n\r\n`;
      }

      rawEmail += `--${boundary}--`;
    } else {
      // Simple HTML email
      rawEmail += 'Content-Type: text/html; charset=UTF-8\r\n\r\n';
      rawEmail += message.html;
    }

    return rawEmail;
  }
}
