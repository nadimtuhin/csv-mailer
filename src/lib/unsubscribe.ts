import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

// Token payload for unsubscribe links
export interface UnsubscribeTokenPayload {
  email: string;
  organizationId: string;
  campaignId?: string;
}

const SECRET = new TextEncoder().encode(env.JWT_SECRET);
const TOKEN_EXPIRY = '90d'; // Unsubscribe links valid for 90 days

/**
 * Generate a signed token for unsubscribe links
 */
export async function generateUnsubscribeToken(
  payload: UnsubscribeTokenPayload
): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(SECRET);

  return token;
}

/**
 * Verify and decode an unsubscribe token
 * @returns Payload if valid, null if invalid or expired
 */
export async function verifyUnsubscribeToken(
  token: string
): Promise<UnsubscribeTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);

    // Validate required fields
    if (!payload.email || typeof payload.email !== 'string') {
      return null;
    }
    if (!payload.organizationId || typeof payload.organizationId !== 'string') {
      return null;
    }

    return {
      email: payload.email,
      organizationId: payload.organizationId,
      campaignId: payload.campaignId as string | undefined,
    };
  } catch (error) {
    // Token is invalid or expired
    console.error('Invalid unsubscribe token:', error);
    return null;
  }
}

/**
 * Generate unsubscribe URL for email templates
 */
export function generateUnsubscribeUrl(
  email: string,
  organizationId: string,
  campaignId?: string
): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return generateUnsubscribeToken({ email, organizationId, campaignId }).then(
    (token) => `${baseUrl}/unsubscribe?token=${encodeURIComponent(token)}`
  );
}
