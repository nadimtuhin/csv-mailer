import { google } from 'googleapis';

/**
 * Google OAuth Configuration
 */
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback',
};

/**
 * OAuth2 Scopes
 */
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/**
 * Create OAuth2 client
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_OAUTH_CONFIG.clientId,
    GOOGLE_OAUTH_CONFIG.clientSecret,
    GOOGLE_OAUTH_CONFIG.redirectUri
  );
}

/**
 * Generate Google OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const oauth2Client = createOAuth2Client();

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: state || crypto.randomUUID(),
    prompt: 'consent', // Force consent screen to always get refresh token
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function getTokensFromCode(code: string) {
  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  return tokens;
}

/**
 * Get user info from Google
 */
export async function getUserInfo(accessToken: string) {
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({
    auth: oauth2Client,
    version: 'v2',
  });

  const { data } = await oauth2.userinfo.get();

  return {
    id: data.id!,
    email: data.email!,
    name: data.name || '',
    picture: data.picture || '',
    verified_email: data.verified_email || false,
  };
}

/**
 * Verify OAuth configuration is set up
 */
export function validateOAuthConfig(): { isValid: boolean; error?: string } {
  if (!GOOGLE_OAUTH_CONFIG.clientId) {
    return {
      isValid: false,
      error: 'GOOGLE_CLIENT_ID is not configured',
    };
  }

  if (!GOOGLE_OAUTH_CONFIG.clientSecret) {
    return {
      isValid: false,
      error: 'GOOGLE_CLIENT_SECRET is not configured',
    };
  }

  if (!GOOGLE_OAUTH_CONFIG.redirectUri) {
    return {
      isValid: false,
      error: 'GOOGLE_REDIRECT_URI is not configured',
    };
  }

  return { isValid: true };
}
