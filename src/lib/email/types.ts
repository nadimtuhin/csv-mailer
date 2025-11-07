/**
 * Email adapter types and interfaces
 *
 * This module defines the common interface for email adapters,
 * allowing the application to support multiple email providers
 * (SendGrid, AWS SES, Fake mailer for testing)
 */

/**
 * Email attachment data
 */
export interface EmailAttachment {
  content: string; // Base64 encoded content
  filename: string;
  type: string; // MIME type
  disposition: 'attachment' | 'inline';
}

/**
 * Email message data
 */
export interface EmailMessage {
  to: string;
  from: {
    email: string;
    name?: string;
  };
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
}

/**
 * Email send result
 */
export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Email adapter interface
 * All email providers must implement this interface
 */
export interface IEmailAdapter {
  /**
   * Send an email
   */
  send(message: EmailMessage): Promise<EmailSendResult>;

  /**
   * Get the adapter name
   */
  getName(): string;

  /**
   * Validate adapter configuration
   */
  isConfigured(): boolean;
}
