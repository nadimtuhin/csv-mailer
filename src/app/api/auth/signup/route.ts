import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import prisma from '@/lib/prisma';
import { applyAuthRateLimit } from '@/lib/ratelimit';

const SALT_ROUNDS = 10; // Standard practice for bcrypt salt rounds

export async function POST(request: NextRequest) {
  // Apply rate limiting (5 requests per 15 minutes)
  const rateLimitResponse = await applyAuthRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Basic email validation (consider more robust validation)
    if (!/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Basic password length validation
    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 } // Conflict
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create organization slug from email (before @)
    const emailUsername = email.split('@')[0];
    const baseSlug = emailUsername.toLowerCase().replace(/[^a-z0-9]/g, '-');
    let slug = baseSlug;
    let slugSuffix = 1;

    // Ensure slug is unique
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugSuffix}`;
      slugSuffix++;
    }

    // Create user, organization, and link them in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
        },
      });

      // Create organization for the user
      const organization = await tx.organization.create({
        data: {
          name: `${emailUsername}'s Organization`,
          slug,
        },
      });

      // Link user to organization as owner
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'owner',
        },
      });

      return { user, organization };
    });

    // Don't return the password hash in the response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = result.user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        organization: result.organization,
      },
      { status: 201 }
    ); // Created
  } catch (error) {
    console.error('Signup Error:', error);
    // Differentiate between expected errors (like validation) and unexpected server errors
    if (error instanceof SyntaxError) { // Handle JSON parsing errors
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
}
