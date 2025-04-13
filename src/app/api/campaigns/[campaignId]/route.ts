import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/campaigns/[campaignId] - Get details for a specific campaign
export async function GET(
  request: Request, // Keep request param even if unused for now
  { params }: { params: { campaignId: string } }
) {
  const campaignId = params.campaignId;

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

// TODO: Add DELETE handler if needed (e.g., delete campaign and recipients)
// TODO: Add PUT handler for updating campaign name/status manually if needed
