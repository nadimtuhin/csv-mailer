import { Worker, Job } from 'bullmq';
import prisma from '@/lib/prisma';
import {
  CampaignProcessJobData,
  QUEUE_NAMES,
  createRedisConnection,
  addBulkEmailJobs,
  EmailJobData,
} from '@/lib/queue';

/**
 * Process a campaign - fetch recipients and queue email jobs
 */
async function processCampaignJob(job: Job<CampaignProcessJobData>): Promise<void> {
  const { campaignId, organizationId } = job.data;

  console.log(
    `[Scheduler] Processing campaign ${campaignId} for org ${organizationId}`
  );

  try {
    // Fetch campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          where: {
            status: 'pending',
          },
          take: 1000, // Process in batches of 1000
        },
      },
    });

    if (!campaign) {
      console.error(`[Scheduler] Campaign ${campaignId} not found`);
      return;
    }

    // Verify organization matches (security check)
    if (campaign.organizationId !== organizationId) {
      console.error(
        `[Scheduler] Organization mismatch for campaign ${campaignId}`
      );
      return;
    }

    // Check if campaign should be processed
    const now = new Date();
    if (campaign.status === 'scheduled' && campaign.scheduledAt) {
      if (campaign.scheduledAt > now) {
        console.log(
          `[Scheduler] Campaign ${campaignId} scheduled for ${campaign.scheduledAt}, not yet time`
        );
        return;
      }
    }

    // Fetch template HTML
    let templateHtml: string | null = null;
    if (campaign.templateId) {
      const template = await prisma.template.findUnique({
        where: { id: campaign.templateId },
      });
      templateHtml = template?.htmlContent || null;
    }

    if (!templateHtml) {
      console.error(
        `[Scheduler] Template not found for campaign ${campaignId}`
      );

      // Mark campaign as failed
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });
      return;
    }

    // If no pending recipients, check if campaign is complete
    if (campaign.recipients.length === 0) {
      console.log(`[Scheduler] No pending recipients for campaign ${campaignId}`);

      // Check if all recipients have been processed
      const totalRecipients = await prisma.campaignRecipient.count({
        where: { campaignId },
      });

      const processedRecipients = await prisma.campaignRecipient.count({
        where: {
          campaignId,
          status: { in: ['sent', 'failed', 'skipped'] },
        },
      });

      if (totalRecipients === processedRecipients) {
        // Mark campaign as completed
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'completed' },
        });

        console.log(`[Scheduler] Campaign ${campaignId} marked as completed`);

        // Clean up PDF if exists
        if (campaign.pdfTemplatePath) {
          try {
            const fs = await import('fs/promises');
            await fs.unlink(campaign.pdfTemplatePath);
            console.log(
              `[Scheduler] Cleaned up PDF: ${campaign.pdfTemplatePath}`
            );
          } catch (err) {
            // Ignore if file doesn't exist
            console.error(
              `[Scheduler] Failed to cleanup PDF: ${campaign.pdfTemplatePath}`,
              err
            );
          }
        }
      }

      return;
    }

    // Update campaign status to processing
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'processing' },
    });

    console.log(
      `[Scheduler] Queuing ${campaign.recipients.length} email jobs for campaign ${campaignId}`
    );

    // Create email jobs for each recipient
    const emailJobs: Array<{ data: EmailJobData; priority?: number }> =
      campaign.recipients.map((recipient) => ({
        data: {
          campaignId: campaign.id,
          recipientId: recipient.id,
          recipientEmail: recipient.recipientEmail,
          recipientData: { email: recipient.recipientEmail }, // TODO: Parse recipient data if stored
          templateHtml,
          subject: campaign.subject,
          fromEmail: campaign.fromEmail,
          fromName: campaign.fromName || undefined,
          replyToEmail: campaign.replyToEmail,
          pdfTemplatePath: campaign.pdfTemplatePath || undefined,
          organizationId: campaign.organizationId,
        },
        priority: 0,
      }));

    // Add jobs to email queue in bulk
    await addBulkEmailJobs(emailJobs);

    console.log(
      `[Scheduler] Successfully queued ${emailJobs.length} email jobs for campaign ${campaignId}`
    );

    // Check if there are more pending recipients to process
    const remainingCount = await prisma.campaignRecipient.count({
      where: {
        campaignId,
        status: 'pending',
      },
    });

    if (remainingCount > 0) {
      console.log(
        `[Scheduler] ${remainingCount} pending recipients remaining for campaign ${campaignId}`
      );
      // Could add another scheduler job to continue processing
    }
  } catch (error) {
    console.error(
      `[Scheduler] Error processing campaign ${campaignId}:`,
      error
    );

    // Mark campaign as failed
    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });
    } catch (updateError) {
      console.error(
        `[Scheduler] Failed to update campaign ${campaignId} status:`,
        updateError
      );
    }

    throw error;
  }
}

/**
 * Campaign scheduler worker
 * Processes campaign processing jobs
 */
export const schedulerWorker = new Worker<CampaignProcessJobData>(
  QUEUE_NAMES.CAMPAIGN_SCHEDULER,
  processCampaignJob,
  {
    connection: createRedisConnection(),
    concurrency: 5, // Process up to 5 campaigns concurrently
  }
);

// Event listeners
schedulerWorker.on('completed', (job) => {
  console.log(`[Scheduler] Job ${job.id} completed successfully`);
});

schedulerWorker.on('failed', (job, err) => {
  console.error(`[Scheduler] Job ${job?.id} failed:`, err.message);
});

schedulerWorker.on('error', (err) => {
  console.error('[Scheduler] Worker error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Scheduler] Received SIGINT, closing worker...');
  await schedulerWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Scheduler] Received SIGTERM, closing worker...');
  await schedulerWorker.close();
  process.exit(0);
});

console.log(`[Scheduler] Campaign scheduler worker started (PID: ${process.pid})`);
console.log(`[Scheduler] Listening to queue: ${QUEUE_NAMES.CAMPAIGN_SCHEDULER}`);
console.log(`[Scheduler] Concurrency: 5`);
