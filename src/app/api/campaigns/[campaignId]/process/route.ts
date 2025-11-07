import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { addCampaignProcessJob } from '@/lib/queue';
import type { Campaign } from '@prisma/client';

/**
 * POST /api/campaigns/[campaignId]/process
 * Queue a campaign for processing using BullMQ
 *
 * Accepts optional body: { retryFailed: true } to re-queue failed recipients
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { campaignId } = params;
  let retryFailed = false;

  // Get organizationId from middleware-set header
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 400 }
    );
  }

  // Check request body for retry flag
  try {
    const body = await request.json();
    if (body && body.retryFailed === true) {
      retryFailed = true;
      console.log(`Retrying failed recipients for campaign ${campaignId}...`);
    }
  } catch {
    // Ignore error if body is empty or not JSON (default to processing pending)
  }

  try {
    // Fetch campaign details
    const campaign: Campaign | null = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json(
        { message: 'Campaign not found.' },
        { status: 404 }
      );
    }

    // Verify campaign belongs to user's organization (tenant isolation)
    if (campaign.organizationId !== organizationId) {
      return NextResponse.json(
        { message: 'Access denied: campaign belongs to different organization' },
        { status: 403 }
      );
    }

    // Check campaign status and schedule
    const now = new Date();

    if (retryFailed) {
      // Retry failed recipients
      if (campaign.status !== 'failed' && campaign.status !== 'completed') {
        return NextResponse.json(
          { message: `Cannot retry - campaign status is ${campaign.status}` },
          { status: 400 }
        );
      }

      // Check if there are failed recipients
      const failedCount = await prisma.campaignRecipient.count({
        where: {
          campaignId,
          status: 'failed',
        },
      });

      if (failedCount === 0) {
        return NextResponse.json(
          { message: 'No failed recipients to retry' },
          { status: 400 }
        );
      }

      // Reset failed recipients to pending for retry
      await prisma.campaignRecipient.updateMany({
        where: {
          campaignId,
          status: 'failed',
        },
        data: {
          status: 'pending',
          errorMessage: null,
          processedAt: null,
        },
      });

      // Reset campaign status to queued
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          status: 'queued',
          failedCount: { decrement: failedCount },
        },
      });

      console.log(`Reset ${failedCount} failed recipients to pending for campaign ${campaignId}`);
    } else {
      // Process pending recipients
      if (campaign.status === 'scheduled') {
        if (!campaign.scheduledAt) {
          return NextResponse.json(
            { message: 'Campaign is scheduled but missing schedule time' },
            { status: 500 }
          );
        }

        if (campaign.scheduledAt > now) {
          return NextResponse.json(
            {
              message: `Campaign is scheduled for ${campaign.scheduledAt.toISOString()}`,
              scheduledFor: campaign.scheduledAt,
            },
            { status: 202 } // 202 Accepted
          );
        }

        // Scheduled time has passed, update status to queued
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'queued' },
        });
      } else if (campaign.status === 'processing') {
        return NextResponse.json(
          { message: 'Campaign is currently processing' },
          { status: 409 } // 409 Conflict
        );
      } else if (campaign.status === 'completed') {
        return NextResponse.json(
          { message: 'Campaign is already completed' },
          { status: 400 }
        );
      } else if (campaign.status === 'failed') {
        return NextResponse.json(
          { message: 'Campaign has failed. Use retryFailed option to retry' },
          { status: 400 }
        );
      }

      // Check if there are pending recipients
      const pendingCount = await prisma.campaignRecipient.count({
        where: {
          campaignId,
          status: 'pending',
        },
      });

      if (pendingCount === 0) {
        return NextResponse.json(
          { message: 'No pending recipients to process' },
          { status: 400 }
        );
      }
    }

    // Queue the campaign for processing
    await addCampaignProcessJob({
      campaignId,
      organizationId,
    });

    console.log(`Campaign ${campaignId} queued for processing`);

    return NextResponse.json({
      message: 'Campaign queued for processing',
      campaignId,
      status: retryFailed ? 'retrying_failed' : 'queued',
    });
  } catch (error: unknown) {
    console.error(`Error queuing campaign ${campaignId}:`, error);

    return NextResponse.json(
      { message: 'Internal server error processing campaign' },
      { status: 500 }
    );
  }
}
