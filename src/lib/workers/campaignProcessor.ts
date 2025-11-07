import { Worker, Job } from 'bullmq';
import prisma from '@/lib/prisma';
import sgMail from '@sendgrid/mail';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import { mergeDataIntoTemplate } from '@/utils/templateHelper';
import type { Campaign, CampaignRecipient } from '@prisma/client';
import redis from '@/lib/redis';
import { ProcessCampaignJobData, enqueueCampaignProcessing } from '@/lib/queues/campaignQueue';

// Ensure SendGrid API Key is set
if (!process.env.SENDGRID_API_KEY) {
  console.error('FATAL ERROR: SENDGRID_API_KEY environment variable is not set.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Define type for SendGrid attachment object
type SendGridAttachment = {
  content: string;
  filename: string;
  type: string;
  disposition: 'attachment' | 'inline';
  content_id?: string;
};

// Process campaign job - core business logic
async function processCampaignJob(job: Job<ProcessCampaignJobData>) {
  const { campaignId, organizationId, retryFailed = false } = job.data;

  console.log(`🔄 Processing campaign ${campaignId} for org ${organizationId}`);

  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('Server configuration error: SendGrid API Key missing.');
  }

  let campaign: Campaign | null = null;

  try {
    // 1. Fetch Campaign Details
    campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId }, // Tenant isolation
    });

    if (!campaign) {
      throw new Error(`Campaign ${campaignId} not found.`);
    }

    // --- Status and Schedule Check ---
    const now = new Date();
    let canProcess = false;
    let statusToProcess: 'pending' | 'failed' = 'pending';

    if (retryFailed) {
      if (campaign.status === 'failed' || campaign.status === 'completed') {
        console.log(`Retrying failed recipients for campaign ${campaignId}.`);
        canProcess = true;
        statusToProcess = 'failed';
      } else if (campaign.status === 'processing') {
        throw new Error(`Campaign ${campaignId} is currently processing.`);
      } else {
        throw new Error(
          `Campaign ${campaignId} status is ${campaign.status}. Cannot retry.`
        );
      }
    } else {
      // Not retrying failed
      if (campaign.status === 'scheduled') {
        if (!campaign.scheduledAt) {
          console.error(
            `Campaign ${campaignId} has status 'scheduled' but no scheduledAt time.`
          );
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'failed' },
          });
          throw new Error('Campaign is scheduled but missing schedule time.');
        } else if (campaign.scheduledAt > now) {
          // Job was added too early, re-queue it
          throw new Error(
            `Campaign ${campaignId} is scheduled for ${campaign.scheduledAt.toISOString()}.`
          );
        } else {
          console.log(
            `Campaign ${campaignId} was scheduled for ${campaign.scheduledAt}. Processing now.`
          );
          canProcess = true;
          statusToProcess = 'pending';
        }
      } else if (campaign.status === 'queued') {
        console.log(`Campaign ${campaignId} is queued. Processing now.`);
        canProcess = true;
        statusToProcess = 'pending';
      } else if (campaign.status === 'processing') {
        throw new Error(
          `Campaign ${campaignId} is already processing. Skipping concurrent request.`
        );
      } else if (campaign.status === 'completed') {
        throw new Error(`Campaign ${campaignId} is already completed.`);
      } else if (campaign.status === 'failed') {
        throw new Error(
          `Campaign ${campaignId} has failed. Use retry option to process failed recipients.`
        );
      } else {
        // Includes 'pending' or unexpected status
        console.warn(
          `Campaign ${campaignId} has unexpected status ${campaign.status}. Attempting to process as 'queued'.`
        );
        canProcess = true;
        statusToProcess = 'pending';
      }
    }

    if (!canProcess) {
      throw new Error('Campaign cannot be processed in its current state.');
    }

    // Update status to 'processing'
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'processing', updatedAt: now },
    });

    // Update job progress
    await job.updateProgress(10);

    // 2. Fetch Template HTML
    const template = campaign.templateId
      ? await prisma.template.findFirst({
          where: { id: campaign.templateId, organizationId }, // Tenant isolation
        })
      : null;
    const templateHtml = template?.htmlContent;

    if (!templateHtml) {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'failed' },
      });
      throw new Error(
        `Template content not found for campaign ${campaignId} (Template ID: ${campaign.templateId})`
      );
    }

    await job.updateProgress(20);

    // 3. Fetch Recipients to Process
    const recipientsToProcess = await prisma.campaignRecipient.findMany({
      where: {
        campaignId: campaignId,
        status: statusToProcess,
      },
      take: 100, // Process in batches of 100
    });

    if (recipientsToProcess.length === 0) {
      const message = `No ${statusToProcess} recipients found for campaign ${campaignId}.`;
      console.log(message);

      // Check if campaign is complete
      if (!retryFailed) {
        const remainingCount = await prisma.campaignRecipient.count({
          where: {
            campaignId: campaignId,
            status: { in: ['pending', 'failed'] },
          },
        });

        if (remainingCount === 0) {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'completed', updatedAt: new Date() },
          });
          console.log(
            `Campaign ${campaignId} marked as completed (no pending/failed remain).`
          );

          // Clean up temp PDF
          if (campaign?.pdfTemplatePath) {
            try {
              await fs.unlink(campaign.pdfTemplatePath);
              console.log(`Cleaned up PDF: ${campaign.pdfTemplatePath}`);
            } catch (e: unknown) {
              if (
                typeof e === 'object' &&
                e !== null &&
                'code' in e &&
                (e as { code: string }).code !== 'ENOENT'
              ) {
                console.error(
                  `Failed PDF cleanup: ${campaign.pdfTemplatePath}`,
                  e
                );
              }
            }
          }
        } else {
          await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'failed', updatedAt: new Date() },
          });
          console.log(
            `Campaign ${campaignId} finished with ${remainingCount} pending/failed recipients.`
          );
        }
      }

      await job.updateProgress(100);
      return { message, processed: 0 };
    }

    console.log(
      `Processing ${recipientsToProcess.length} recipients for campaign ${campaignId}...`
    );
    await job.updateProgress(30);

    // 4. Process Each Recipient
    let batchSentCount = 0;
    let batchFailedCount = 0;
    const totalRecipients = recipientsToProcess.length;

    const processingPromises = recipientsToProcess.map(
      async (recipient: CampaignRecipient, index: number) => {
        let pdfAttachmentBytes: Buffer | null = null;
        let finalStatus: 'sent' | 'failed' = 'failed';
        let errorMessage: string | null = null;

        try {
          if (!campaign) throw new Error('Campaign data unavailable during processing.');

          // --- PDF Processing (if applicable) ---
          if (campaign?.pdfTemplatePath) {
            try {
              const pdfTemplateBytes = await fs.readFile(campaign.pdfTemplatePath);
              const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
              pdfAttachmentBytes = Buffer.from(await pdfDoc.save());
            } catch (pdfError) {
              console.error(
                `PDF processing error for ${recipient.recipientEmail}:`,
                pdfError
              );
              throw new Error('PDF processing failed');
            }
          }

          // --- Prepare Email ---
          const recipientDataForMerge = { email: recipient.recipientEmail };
          const personalizedHtml = mergeDataIntoTemplate(
            templateHtml,
            recipientDataForMerge
          );
          const attachments: SendGridAttachment[] = [];

          if (pdfAttachmentBytes) {
            attachments.push({
              content: pdfAttachmentBytes.toString('base64'),
              filename: `attachment_${recipient.recipientEmail.split('@')[0]}.pdf`,
              type: 'application/pdf',
              disposition: 'attachment',
            });
          }

          const msg = {
            to: recipient.recipientEmail,
            from: { email: campaign.fromEmail, name: campaign.fromName || undefined },
            replyTo: campaign.replyToEmail,
            subject: campaign.subject,
            html: personalizedHtml,
            attachments: attachments,
          };

          // --- Send Email ---
          await sgMail.send(msg);
          finalStatus = 'sent';
          batchSentCount++;

          // Update progress based on recipients processed
          const progress = Math.min(
            30 + Math.floor((index / totalRecipients) * 60),
            90
          );
          await job.updateProgress(progress);
        } catch (error: unknown) {
          finalStatus = 'failed';
          errorMessage = error instanceof Error ? error.message : String(error);
          console.error(
            `Failed sending to ${recipient.recipientEmail}:`,
            errorMessage
          );
          batchFailedCount++;
        }

        // --- Update Recipient Status ---
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: finalStatus,
            errorMessage: finalStatus === 'sent' ? null : errorMessage,
            processedAt: new Date(),
          },
        });
      }
    );

    // Wait for all promises in the batch to settle
    await Promise.allSettled(processingPromises);
    await job.updateProgress(90);

    // 5. Update Campaign Counts
    const updatedCampaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: batchSentCount },
        failedCount: { increment: batchFailedCount },
        updatedAt: new Date(),
      },
      select: {
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
      },
    });

    // Check if campaign is complete after this batch
    const finalRemainingCount = await prisma.campaignRecipient.count({
      where: { campaignId: campaignId, status: { in: ['pending', 'failed'] } },
    });

    let finalCampaignStatus: string;
    if (finalRemainingCount === 0) {
      finalCampaignStatus = 'completed';
      console.log(
        `Campaign ${campaignId} marked as completed (no pending/failed remain after batch).`
      );

      // Clean up temp PDF
      if (campaign?.pdfTemplatePath) {
        try {
          await fs.unlink(campaign.pdfTemplatePath);
          console.log(`Cleaned up PDF: ${campaign.pdfTemplatePath}`);
        } catch (e: unknown) {
          if (
            typeof e === 'object' &&
            e !== null &&
            'code' in e &&
            (e as { code: string }).code !== 'ENOENT'
          ) {
            console.error(`Failed PDF cleanup: ${campaign.pdfTemplatePath}`, e);
          }
        }
      }
    } else {
      // If there are more recipients, enqueue another batch job
      finalCampaignStatus = 'processing';
      console.log(
        `Campaign ${campaignId} has ${finalRemainingCount} recipients remaining. Enqueueing next batch.`
      );

      // Enqueue next batch
      await enqueueCampaignProcessing({
        campaignId,
        organizationId,
        batchNumber: (job.data.batchNumber || 0) + 1,
        retryFailed,
      });
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: finalCampaignStatus, updatedAt: new Date() },
    });

    await job.updateProgress(100);

    return {
      message: `Processed batch for campaign ${campaignId}. Sent: ${batchSentCount}, Failed: ${batchFailedCount}.`,
      sent: batchSentCount,
      failed: batchFailedCount,
      remaining: finalRemainingCount,
    };
  } catch (error: unknown) {
    console.error(`Error processing campaign ${campaignId}:`, error);

    // Mark campaign as failed if a major error occurs
    if (campaignId) {
      try {
        await prisma.campaign.update({
          where: { id: campaignId },
          data: { status: 'failed' },
        });
      } catch (updateError) {
        console.error(
          `Failed to mark campaign ${campaignId} as failed:`,
          updateError
        );
      }
    }

    throw error; // Re-throw to trigger BullMQ retry
  }
}

// Create the worker
export const campaignWorker = new Worker<ProcessCampaignJobData>(
  'campaign-processing',
  async (job) => {
    return await processCampaignJob(job);
  },
  {
    connection: redis,
    concurrency: 5, // Process up to 5 campaigns concurrently
    limiter: {
      max: 10, // Max 10 jobs
      duration: 1000, // per second
    },
  }
);

// Worker event listeners
campaignWorker.on('completed', (job) => {
  console.log(`✅ Worker completed job ${job.id}`);
});

campaignWorker.on('failed', (job, error) => {
  console.error(`❌ Worker failed job ${job?.id}:`, error.message);
});

campaignWorker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

export default campaignWorker;
