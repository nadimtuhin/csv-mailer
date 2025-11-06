import { NextResponse } from 'next/server';
import { getAuthorizationUrl, validateOAuthConfig } from '@/lib/googleOAuth';

/**
 * GET /api/auth/google
 * Initiates Google OAuth flow by redirecting to Google's authorization page
 */
export async function GET(request: Request) {
  try {
    // Validate OAuth configuration
    const configValidation = validateOAuthConfig();
    if (!configValidation.isValid) {
      return NextResponse.json(
        { error: `OAuth configuration error: ${configValidation.error}` },
        { status: 500 }
      );
    }

    // Get redirect URL from query params (where to send user after successful auth)
    const { searchParams } = new URL(request.url);
    const redirectTo = searchParams.get('redirectTo') || '/dashboard';

    // Generate state parameter for CSRF protection
    const state = JSON.stringify({
      redirectTo,
      timestamp: Date.now(),
    });

    // Get Google authorization URL
    const authUrl = getAuthorizationUrl(state);

    // Redirect user to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google authentication' },
      { status: 500 }
    );
  }
}
