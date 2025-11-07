/**
 * Email Adapter Factory
 *
 * Creates the appropriate email adapter based on environment configuration
 */

import type { IEmailAdapter } from './types';
import { SendGridAdapter } from './sendgrid-adapter';
import { SESAdapter } from './ses-adapter';
import { FakeAdapter } from './fake-adapter';
import { getEnv, isTest } from '@/lib/env';

export type EmailProvider = 'sendgrid' | 'ses' | 'fake';

/**
 * Create email adapter based on configuration
 */
export function createEmailAdapter(
  provider?: EmailProvider
): IEmailAdapter {
  const env = getEnv();

  // Determine provider from env or parameter
  const selectedProvider: EmailProvider =
    provider ||
    (env.EMAIL_PROVIDER as EmailProvider) ||
    (isTest() ? 'fake' : 'sendgrid');

  console.log(`[EmailAdapter] Creating email adapter: ${selectedProvider}`);

  switch (selectedProvider) {
    case 'sendgrid':
      return new SendGridAdapter();

    case 'ses':
      return new SESAdapter();

    case 'fake':
      return new FakeAdapter();

    default:
      console.warn(
        `[EmailAdapter] Unknown provider "${selectedProvider}", falling back to SendGrid`
      );
      return new SendGridAdapter();
  }
}

/**
 * Get the default email adapter
 * This is a singleton pattern - creates adapter once and reuses it
 */
let defaultAdapter: IEmailAdapter | null = null;

export function getEmailAdapter(): IEmailAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createEmailAdapter();

    if (!defaultAdapter.isConfigured()) {
      console.warn(
        `[EmailAdapter] ${defaultAdapter.getName()} adapter is not configured. Check environment variables.`
      );
    }
  }

  return defaultAdapter;
}

/**
 * Reset the default adapter (useful for testing)
 */
export function resetEmailAdapter(): void {
  defaultAdapter = null;
}
