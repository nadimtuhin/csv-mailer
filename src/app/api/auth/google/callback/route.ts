import { NextResponse } from 'next/server';
import { getTokensFromCode, getUserInfo } from '@/lib/googleOAuth';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d';
const COOKIE_NAME = 'authToken';

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

/**
 * GET /api/auth/google/callback
 * Handles the OAuth callback from Google
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors (user denied, etc.)
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=missing_code', request.url)
      );
    }

    // Parse state parameter
    let redirectTo = '/dashboard';
    if (state) {
      try {
        const stateData = JSON.parse(state);
        redirectTo = stateData.redirectTo || '/dashboard';
      } catch {
        // Invalid state, use default redirect
      }
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    if (!tokens.access_token) {
      throw new Error('No access token received from Google');
    }

    // Get user info from Google
    const googleUser = await getUserInfo(tokens.access_token);

    // Check if email is verified
    if (!googleUser.verified_email) {
      return NextResponse.redirect(
        new URL('/login?error=email_not_verified', request.url)
      );
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      // Create new user with OAuth
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          // For OAuth users, we don't have a password
          // Set a random unguessable string that can never be used to login
          password: `oauth_${crypto.randomUUID()}_${Date.now()}`,
          // You might want to add additional fields like:
          // name: googleUser.name,
          // picture: googleUser.picture,
          // googleId: googleUser.id,
        },
      });
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      authMethod: 'google',
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, request.url));

    // Set JWT in HTTP-only cookie
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    console.error('Google OAuth callback error:', error);

    // Redirect to login with error
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent('oauth_failed')}`,
        request.url
      )
    );
  } finally {
    await prisma.$disconnect();
  }
}
