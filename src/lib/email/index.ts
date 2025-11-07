/**
 * Email Module
 *
 * Provides a flexible email adapter system supporting multiple providers:
 * - SendGrid
 * - AWS SES
 * - Fake mailer (for testing)
 */

export * from './types';
export * from './sendgrid-adapter';
export * from './ses-adapter';
export * from './fake-adapter';
export * from './adapter-factory';
