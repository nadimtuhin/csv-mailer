import prisma from '@/lib/prisma';
import { addCampaignProcessJob } from '@/lib/queue';

/**
 * Check for scheduled campaigns that need to be processed
 * Runs periodically (e.g., every minute via cron)
 */
async function checkScheduledCampaigns() {
  console.log('[Cron] Checking for scheduled campaigns...');

  try {
    const now = new Date();

    // Find campaigns that are scheduled and past their scheduled time
    const scheduledCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: now, // Scheduled time is less than or equal to now
        },
      },
      select: {
        id: true,
        organizationId: true,
        name: true,
        scheduledAt: true,
      },
    });

    if (scheduledCampaigns.length === 0) {
      console.log('[Cron] No scheduled campaigns found');
      return;
    }

    console.log(
      `[Cron] Found ${scheduledCampaigns.length} campaigns ready to process`
    );

    // Queue each campaign for processing
    for (const campaign of scheduledCampaigns) {
      console.log(
        `[Cron] Queuing campaign ${campaign.id} (${campaign.name}) scheduled for ${campaign.scheduledAt}`
      );

      await addCampaignProcessJob({
        campaignId: campaign.id,
        organizationId: campaign.organizationId,
      });
    }

    console.log(
      `[Cron] Successfully queued ${scheduledCampaigns.length} campaigns for processing`
    );
  } catch (error) {
    console.error('[Cron] Error checking scheduled campaigns:', error);
  }
}

/**
 * Run the scheduler check
 * This function should be called periodically (e.g., every minute)
 */
async function runScheduler() {
  console.log('[Cron] Starting campaign scheduler cron job...');

  // Run immediately
  await checkScheduledCampaigns();

  // Run every minute
  setInterval(
    async () => {
      await checkScheduledCampaigns();
    },
    60 * 1000
  ); // 60 seconds

  console.log('[Cron] Campaign scheduler cron job running (every 60 seconds)');
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Cron] Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Cron] Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the scheduler
runScheduler().catch((error) => {
  console.error('[Cron] Fatal error:', error);
  process.exit(1);
});
