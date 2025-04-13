import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

import { NextRequest } from 'next/server'; // Use NextRequest

// GET /api/campaigns/[campaignId] - Get details for a specific campaign
export async function GET(
  request: NextRequest,
  context: { params: { campaignId: string } } // Use context object
) {
  const campaignId = context.params.campaignId; // Access campaignId from context.params

  if (!campaignId) {
      return NextResponse.json({ message: 'Campaign ID is required.' }, { status: 400 });
  }

  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        // Include recipient statuses, possibly paginated in the future
        recipients: {
          orderBy: [ // Use an array for multiple order conditions
            { status: 'asc' },
            { recipientEmail: 'asc' },
          ],
          select: { // Select only needed fields for the detail view
            id: true,
            recipientEmail: true,
            status: true,
            errorMessage: true,
            processedAt: true,
          },
          // Add pagination later if recipient lists get very large
          // take: 100,
          // skip: 0,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ message: 'Campaign not found.' }, { status: 404 });
    }

    // Optionally calculate percentages or add other derived data here if needed
    // const totalProcessed = campaign.sentCount + campaign.failedCount + campaign.skippedCount;
    // const progressPercent = campaign.totalRecipients > 0 ? (totalProcessed / campaign.totalRecipients) * 100 : 0;

    return NextResponse.json(campaign);

  } catch (error: unknown) {
    console.error(`Error fetching campaign details for ${campaignId}:`, error);
    const message = error instanceof Error ? error.message : 'Internal server error fetching campaign details.';
    return NextResponse.json({ message }, { status: 500 });
  }
}

// PATCH /api/campaigns/[campaignId] - Archive a specific campaign
export async function PATCH(
  request: NextRequest,
  context: { params: { campaignId: string } } // Use context object
) {
  const campaignId = context.params.campaignId; // Access campaignId from context.params

  if (!campaignId) {
    return NextResponse.json({ message: 'Campaign ID is required.' }, { status: 400 });
  }

  try {
    // Check if the campaign exists
    const existingCampaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { isArchived: true }, // Only need to check the archive status
    });

    if (!existingCampaign) {
      return NextResponse.json({ message: 'Campaign not found.' }, { status: 404 });
    }

    if (existingCampaign.isArchived) {
      // Already archived, return success or indicate no change
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

// TODO: Add DELETE handler if needed (e.g., delete campaign and recipients)
// TODO: Add PUT handler for updating campaign name/status manually if needed
