/**
 * SendGrid Email Adapter
 *
 * Implements email sending using SendGrid's API
 */

import sgMail from '@sendgrid/mail';
import type { IEmailAdapter, EmailMessage, EmailSendResult } from './types';

export class SendGridAdapter implements IEmailAdapter {
  private apiKey: string;
  private configured: boolean = false;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SENDGRID_API_KEY || '';

    if (this.apiKey) {
      sgMail.setApiKey(this.apiKey);
      this.configured = true;
    }
  }

  getName(): string {
    return 'SendGrid';
  }

  isConfigured(): boolean {
    return this.configured && this.apiKey.length > 0;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SendGrid adapter not configured. Missing SENDGRID_API_KEY.',
      };
    }

    try {
      // Convert our standard message format to SendGrid format
      const sgMessage = {
        to: message.to,
        from: message.from,
        replyTo: message.replyTo,
        subject: message.subject,
        html: message.html,
        attachments: message.attachments,
        headers: message.headers,
      };

      const [response] = await sgMail.send(sgMessage);

      return {
        success: true,
        messageId: response.headers['x-message-id'] as string,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SendGridAdapter] Send failed:', errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
}
