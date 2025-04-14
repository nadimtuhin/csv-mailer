import { NextResponse } from 'next/server';
// Removed unused cookies import from next/headers

const COOKIE_NAME = 'authToken'; // Must match the name used in login/middleware

export async function POST() {
  // In a real app, you might want CSRF protection for logout,
  // but for simplicity, we'll just clear the cookie on POST.

  try {
    // Create a response object to set the cookie on
    const response = NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });

    // Clear the authentication cookie by setting its maxAge to -1
    response.cookies.set(COOKIE_NAME, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: -1, // Expire the cookie immediately
    });

    return response;
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred during logout' },
      { status: 500 }
    );
  }
}
