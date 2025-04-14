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
  // Added '/' to the public paths
  const publicPaths = ['/', '/login', '/signup', '/api/auth/login', '/api/auth/signup'];

  // Allow requests to public paths and Next.js internal paths/static files
  if (
    pathname === '/' || // Explicitly allow the root path
    publicPaths.some(path => pathname.startsWith(path) && path !== '/') || // Check other public paths (excluding root)
    pathname.startsWith('/_next/') || // Next.js internal assets
    pathname.startsWith('/api/') && !publicPaths.some(path => pathname.startsWith(path)) || // Allow non-auth API routes
    /\.(.*)$/.test(pathname) // Allow requests for static files (e.g., .css, .js, .png)
  ) {
    return NextResponse.next();
  }

  // Get the token from the cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    // Redirect to login if no token found for a protected route
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', pathname); // Optional: tell login where user was going
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
    // Clear the invalid cookie before redirecting
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set(COOKIE_NAME, '', { maxAge: -1, path: '/' }); // Clear the cookie
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
