/**
 * Fake Email Adapter
 *
 * A mock email adapter for testing and development.
 * Logs emails to console instead of actually sending them.
 */

import type { IEmailAdapter, EmailMessage, EmailSendResult } from './types';

export interface FakeEmailLog {
  timestamp: Date;
  message: EmailMessage;
  messageId: string;
}

export class FakeAdapter implements IEmailAdapter {
  private static sentEmails: FakeEmailLog[] = [];
  private shouldFail: boolean = false;

  constructor(options?: { shouldFail?: boolean }) {
    this.shouldFail = options?.shouldFail || false;
  }

  getName(): string {
    return 'Fake Mailer';
  }

  isConfigured(): boolean {
    return true; // Fake adapter is always configured
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    // Simulate sending delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (this.shouldFail) {
      console.log('[FakeAdapter] Simulating send failure');
      return {
        success: false,
        error: 'Simulated email send failure',
      };
    }

    const messageId = `fake-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Log email to console
    console.log('[FakeAdapter] Email sent:');
    console.log('  To:', message.to);
    console.log('  From:', `${message.from.name || ''} <${message.from.email}>`);
    console.log('  Subject:', message.subject);
    console.log('  HTML length:', message.html.length);
    console.log('  Attachments:', message.attachments?.length || 0);
    console.log('  Message ID:', messageId);

    // Store email for testing/inspection
    FakeAdapter.sentEmails.push({
      timestamp: new Date(),
      message,
      messageId,
    });

    return {
      success: true,
      messageId,
    };
  }

  /**
   * Get all sent emails (for testing)
   */
  static getSentEmails(): FakeEmailLog[] {
    return [...FakeAdapter.sentEmails];
  }

  /**
   * Get last sent email (for testing)
   */
  static getLastSentEmail(): FakeEmailLog | null {
    return FakeAdapter.sentEmails[FakeAdapter.sentEmails.length - 1] || null;
  }

  /**
   * Clear sent emails log (for testing)
   */
  static clearSentEmails(): void {
    FakeAdapter.sentEmails = [];
  }

  /**
   * Find sent email by recipient (for testing)
   */
  static findByRecipient(email: string): FakeEmailLog | null {
    return (
      FakeAdapter.sentEmails.find((log) => log.message.to === email) || null
    );
  }

  /**
   * Get count of sent emails (for testing)
   */
  static getSentCount(): number {
    return FakeAdapter.sentEmails.length;
  }
}
