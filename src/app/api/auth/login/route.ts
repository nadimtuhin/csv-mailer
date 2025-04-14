import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';
// Removed unused cookies import from next/headers

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1d'; // Token expiration time (e.g., 1 day)
const COOKIE_NAME = 'authToken'; // Name for the cookie storing the JWT

if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not set.');
  // In a real app, you might want to prevent the server from starting
  // or handle this more gracefully depending on your deployment strategy.
  // For now, we'll throw an error during initialization if it's missing.
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Unauthorized
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 }); // Unauthorized
    }

    // Generate JWT
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      // Add any other relevant non-sensitive user data you might need client-side
    };

    // Use non-null assertion (!) because we checked JWT_SECRET at the top level
    const token = jwt.sign(tokenPayload, JWT_SECRET!, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // Prepare user info to return (excluding password)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    // Create the response first
    const response = NextResponse.json(userWithoutPassword, { status: 200 });

    // Set the JWT in an HTTP-only cookie on the response
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true, // Makes the cookie inaccessible to client-side JavaScript
      secure: process.env.NODE_ENV === 'production', // Send only over HTTPS in production
      sameSite: 'lax', // Protects against CSRF attacks
      path: '/', // Cookie available across the entire site
      maxAge: 60 * 60 * 24, // 1 day in seconds (matches JWT expiry)
    });

    return response; // Return the response with the cookie set

  } catch (error) {
    console.error('Login Error:', error);
     if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
