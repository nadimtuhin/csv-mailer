import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { NextRequest } from 'next/server'; // Use NextRequest

// GET /api/campaigns/[campaignId] - Get details for a specific campaign (tenant-scoped)
export async function GET(
  request: NextRequest,
  context: { params: { campaignId: string } }
) {
  const { params } = context;
  const campaignId = params.campaignId;

  // Get organizationId from middleware-set header (tenant isolation)
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json({ message: 'Organization context required' }, { status: 400 });
  }

  if (!campaignId) {
    return NextResponse.json({ message: 'Campaign ID is required.' }, { status: 400 });
  }

  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId, // CRITICAL: Tenant isolation
      },
      include: {
        recipients: {
          orderBy: [
            { status: 'asc' },
            { recipientEmail: 'asc' },
          ],
          select: {
            id: true,
            recipientEmail: true,
            status: true,
            errorMessage: true,
            processedAt: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ message: 'Campaign not found.' }, { status: 404 });
    }

    return NextResponse.json(campaign);

  } catch (error: unknown) {
    console.error(`Error fetching campaign details for ${campaignId}:`, error);
    const message = error instanceof Error ? error.message : 'Internal server error fetching campaign details.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// PATCH /api/campaigns/[campaignId] - Archive a specific campaign (tenant-scoped)
export async function PATCH(
  request: NextRequest,
  context: { params: { campaignId: string } }
) {
  const { params } = context;
  const campaignId = params.campaignId;

  // Get organizationId from middleware-set header (tenant isolation)
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json({ message: 'Organization context required' }, { status: 400 });
  }

  if (!campaignId) {
    return NextResponse.json({ message: 'Campaign ID is required.' }, { status: 400 });
  }

  try {
    // Check if the campaign exists and belongs to user's organization
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { isArchived: true, organizationId: true },
    });

    if (!existingCampaign) {
      return NextResponse.json({ message: 'Campaign not found.' }, { status: 404 });
    }

    // CRITICAL: Verify campaign belongs to user's organization (tenant isolation)
    if (existingCampaign.organizationId !== organizationId) {
      return NextResponse.json(
        { message: 'Access denied: campaign belongs to different organization' },
        { status: 403 }
      );
    }

    if (existingCampaign.isArchived) {
      return NextResponse.json({ message: 'Campaign is already archived.' }, { status: 200 });
    }

    // Update the campaign to set isArchived to true
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { isArchived: true },
    });

    return NextResponse.json({ message: 'Campaign archived successfully.' }, { status: 200 });

  } catch (error: unknown) {
    console.error(`Error archiving campaign ${campaignId}:`, error);
    const message = error instanceof Error ? error.message : 'Internal server error archiving campaign.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
