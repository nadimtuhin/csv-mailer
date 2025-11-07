import crypto from 'crypto';

/**
 * Generate a secure unsubscribe token
 * Uses crypto.randomBytes for cryptographically strong randomness
 */
export function generateUnsubscribeToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate an unsubscribe link for a given email and organization
 *
 * @param email - Recipient email address
 * @param token - Unique unsubscribe token
 * @param baseUrl - Application base URL (from env or request)
 * @returns Complete unsubscribe URL
 */
export function generateUnsubscribeLink(
  email: string,
  token: string,
  baseUrl: string = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
): string {
  const params = new URLSearchParams({
    email,
    token,
  });

  return `${baseUrl}/unsubscribe?${params.toString()}`;
}

/**
 * Validate unsubscribe token format
 * @param token - Token to validate
 * @returns true if token format is valid
 */
export function isValidTokenFormat(token: string): boolean {
  // Token should be 64 hex characters (32 bytes in hex)
  return /^[a-f0-9]{64}$/i.test(token);
}
