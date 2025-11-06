import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose'; // Using 'jose' library for JWT verification in Edge runtime

const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_NAME = 'authToken'; // Must match the name used in the login API

// Function to get the secret key as Uint8Array
async function getSecretKey(): Promise<Uint8Array> {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set.');
  }
  // Encode the secret key as Uint8Array for jose
  return new TextEncoder().encode(JWT_SECRET);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Define public paths that don't require authentication
  const publicPaths = [
    '/',
    '/login',
    '/signup',
    '/api/auth/login',
    '/api/auth/signup',
    '/api/auth/logout',
    '/api/auth/google',
    '/api/auth/google/callback',
  ];

  // Define protected API routes that require authentication
  const protectedApiPrefixes = [
    '/api/templates',
    '/api/campaigns',
    '/api/pdf',
    '/api/send-emails',
  ];

  // Check if this is a protected API route
  const isProtectedApi = protectedApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Allow public paths and Next.js internal paths/static files
  if (
    publicPaths.some((path) => pathname === path || pathname.startsWith(path)) ||
    pathname.startsWith('/_next/') || // Next.js internal assets
    /\.(.*)$/.test(pathname) // Static files (e.g., .css, .js, .png)
  ) {
    return NextResponse.next();
  }

  // For protected API routes, check for valid JWT token
  if (isProtectedApi) {
    const token = request.cookies.get(COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required. Please login.' },
        { status: 401 }
      );
    }

    try {
      // Verify the token
      const secretKey = await getSecretKey();
      const { payload } = await jwtVerify(token, secretKey);

      // Add user info to headers for downstream use (optional)
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', payload.userId as string);
      requestHeaders.set('x-user-email', payload.email as string);

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      console.error('JWT Verification Error:', error);

      // Return 401 for invalid token on API routes
      const response = NextResponse.json(
        { error: 'Invalid or expired token. Please login again.' },
        { status: 401 }
      );
      response.cookies.set(COOKIE_NAME, '', { maxAge: -1, path: '/' });
      return response;
    }
  }

  // For protected page routes (non-API), check for valid JWT token
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Redirect to login if no token found for a protected page route
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verify the token
    const secretKey = await getSecretKey();
    await jwtVerify(token, secretKey);

    // Token is valid, allow the request to proceed
    return NextResponse.next();
  } catch (error) {
    console.error('JWT Verification Error:', error);
    // Token is invalid or expired, redirect to login
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(COOKIE_NAME, '', { maxAge: -1, path: '/' });
    return response;
  }
}

// Specify the paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes - handled inside the middleware logic)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (handled inside the middleware logic)
     * We will handle API routes and public paths explicitly within the middleware function.
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
