import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyUnsubscribeToken } from '@/lib/unsubscribe';

/**
 * POST /api/unsubscribe
 * Unsubscribe an email address from future campaigns
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, reason } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    const payload = await verifyUnsubscribeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }

    const { email, organizationId, campaignId } = payload;

    // Add to unsubscribe list (upsert to handle duplicates)
    await prisma.unsubscribe.upsert({
      where: {
        email_organizationId: {
          email,
          organizationId,
        },
      },
      update: {
        reason: reason || null,
        campaignId: campaignId || null,
      },
      create: {
        email,
        organizationId,
        reason: reason || null,
        campaignId: campaignId || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'You have been successfully unsubscribed',
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/unsubscribe?token=xxx
 * Verify token and return email info (for confirmation page)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Verify the token
    const payload = await verifyUnsubscribeToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 400 }
      );
    }

    // Check if already unsubscribed
    const existing = await prisma.unsubscribe.findUnique({
      where: {
        email_organizationId: {
          email: payload.email,
          organizationId: payload.organizationId,
        },
      },
    });

    return NextResponse.json({
      email: payload.email,
      alreadyUnsubscribed: !!existing,
    });
  } catch (error) {
    console.error('Unsubscribe verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify unsubscribe token' },
      { status: 500 }
    );
  }
}
