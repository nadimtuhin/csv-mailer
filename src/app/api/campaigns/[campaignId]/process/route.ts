import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { enqueueCampaignProcessing } from '@/lib/queues/campaignQueue';

/**
 * POST /api/campaigns/[campaignId]/process
 *
 * Enqueues a campaign for background processing using BullMQ.
 * The actual email sending logic runs in the worker process.
 *
 * Accepts optional body: { retryFailed: true } to reprocess failed recipients
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { campaignId } = params;
  let retryFailed = false;

  // Get organizationId from middleware-injected header
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 403 }
    );
  }

  // Check request body for retry flag
  try {
    const body = await request.json();
    if (body && body.retryFailed === true) {
      retryFailed = true;
      console.log(`Retry requested for campaign ${campaignId}...`);
    }
  } catch {
    // Ignore error if body is empty or not JSON (default to processing pending)
  }

  try {
    // 1. Fetch Campaign to validate it exists and belongs to this organization
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        organizationId: organizationId,
      },
    });

    if (!campaign) {
      return NextResponse.json({ message: 'Campaign not found.' }, { status: 404 });
    }

    // 2. Validate campaign can be processed
    if (!retryFailed) {
      // For initial processing
      if (campaign.status === 'processing') {
        return NextResponse.json(
          { message: 'Campaign is already being processed.' },
          { status: 409 }
        );
      }
      if (campaign.status === 'completed') {
        return NextResponse.json(
          { message: 'Campaign is already completed.' },
          { status: 400 }
        );
      }
      if (campaign.status === 'failed') {
        return NextResponse.json(
          { message: 'Campaign has failed. Use retry option to reprocess.' },
          { status: 400 }
        );
      }
    } else {
      // For retry
      if (campaign.status === 'processing') {
        return NextResponse.json(
          { message: 'Campaign is currently processing. Cannot retry now.' },
          { status: 409 }
        );
      }
      if (campaign.status !== 'failed' && campaign.status !== 'completed') {
        return NextResponse.json(
          { message: `Campaign status (${campaign.status}) does not allow retrying.` },
          { status: 400 }
        );
      }
    }

    // 3. Enqueue the campaign processing job
    const job = await enqueueCampaignProcessing({
      campaignId,
      organizationId,
      retryFailed,
    });

    console.log(`✅ Campaign ${campaignId} enqueued for processing (Job ID: ${job.id})`);

    return NextResponse.json({
      message: retryFailed
        ? `Campaign retry enqueued successfully.`
        : `Campaign processing started.`,
      jobId: job.id,
      campaignId: campaign.id,
    });
  } catch (error: unknown) {
    console.error(`Error enqueueing campaign ${campaignId}:`, error);
    const message =
      error instanceof Error
        ? error.message
        : 'Internal server error enqueueing campaign.';
    return NextResponse.json({ message: message }, { status: 500 });
  }
}
