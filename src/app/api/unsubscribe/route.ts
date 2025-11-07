import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateUnsubscribeToken, isValidTokenFormat } from '@/utils/unsubscribeToken';

/**
 * POST /api/unsubscribe
 *
 * Process an unsubscribe request
 * Body: { email: string, token: string, reason?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, reason } = body;

    // Validate input
    if (!email || !token) {
      return NextResponse.json(
        { message: 'Email and token are required.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ message: 'Invalid email format.' }, { status: 400 });
    }

    // Validate token format
    if (!isValidTokenFormat(token)) {
      return NextResponse.json({ message: 'Invalid token format.' }, { status: 400 });
    }

    // Find the unsubscribe record by token to get organization context
    const unsubscribeRecord = await prisma.unsubscribe.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If no record found, this might be a first-time unsubscribe without a token
    // In this case, we need to determine the organization from context
    // For now, we'll require the token to exist
    if (!unsubscribeRecord) {
      return NextResponse.json(
        { message: 'Invalid or expired unsubscribe link.' },
        { status: 404 }
      );
    }

    // Verify the email matches
    if (unsubscribeRecord.email !== email) {
      return NextResponse.json(
        { message: 'Email does not match token.' },
        { status: 403 }
      );
    }

    // Check if already unsubscribed
    const existingUnsubscribe = await prisma.unsubscribe.findUnique({
      where: {
        email_organizationId: {
          email,
          organizationId: unsubscribeRecord.organizationId,
        },
      },
    });

    if (existingUnsubscribe) {
      return NextResponse.json({
        message: 'You are already unsubscribed.',
        email,
        organization: unsubscribeRecord.organization.name,
        unsubscribedAt: existingUnsubscribe.createdAt,
      });
    }

    // Create unsubscribe record
    const newUnsubscribe = await prisma.unsubscribe.create({
      data: {
        email,
        organizationId: unsubscribeRecord.organizationId,
        token,
        reason: reason || null,
      },
    });

    console.log(
      `✅ ${email} unsubscribed from organization ${unsubscribeRecord.organization.name}`
    );

    return NextResponse.json({
      message: 'Successfully unsubscribed.',
      email,
      organization: unsubscribeRecord.organization.name,
      unsubscribedAt: newUnsubscribe.createdAt,
    });
  } catch (error: unknown) {
    console.error('Error processing unsubscribe:', error);
    const message =
      error instanceof Error ? error.message : 'Internal server error processing unsubscribe.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * GET /api/unsubscribe?email=...&organizationId=...
 *
 * Check if an email is unsubscribed for a given organization
 * (Internal API, requires organizationId header)
 */
export async function GET(request: NextRequest) {
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ message: 'Email parameter required.' }, { status: 400 });
  }

  try {
    const unsubscribe = await prisma.unsubscribe.findUnique({
      where: {
        email_organizationId: {
          email,
          organizationId,
        },
      },
    });

    return NextResponse.json({
      isUnsubscribed: !!unsubscribe,
      email,
      unsubscribedAt: unsubscribe?.createdAt || null,
      reason: unsubscribe?.reason || null,
    });
  } catch (error: unknown) {
    console.error('Error checking unsubscribe status:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
