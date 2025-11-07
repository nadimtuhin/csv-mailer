import { Worker, Job } from 'bullmq';
import fs from 'fs/promises';
import { PDFDocument } from 'pdf-lib';
import prisma from '@/lib/prisma';
import { mergeDataIntoTemplate } from '@/utils/templateHelper';
import {
  EmailJobData,
  QUEUE_NAMES,
  createRedisConnection,
} from '@/lib/queue';
import { generateUnsubscribeUrl } from '@/lib/unsubscribe';
import { getEmailAdapter } from '@/lib/email';

// Get email adapter (SendGrid, SES, or Fake based on config)
const emailAdapter = getEmailAdapter();

console.log(`[Worker] Using email adapter: ${emailAdapter.getName()}`);

if (!emailAdapter.isConfigured()) {
  console.error(
    `[Worker] FATAL ERROR: ${emailAdapter.getName()} adapter is not configured.`
  );
  console.error('[Worker] Check your environment variables for email provider credentials.');
  process.exit(1);
}

/**
 * Process a single email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const {
    campaignId,
    recipientId,
    recipientEmail,
    recipientData,
    templateHtml,
    subject,
    fromEmail,
    fromName,
    replyToEmail,
    pdfTemplatePath,
    organizationId,
  } = job.data;

  console.log(
    `[Worker] Processing email job ${job.id} for ${recipientEmail} (campaign: ${campaignId})`
  );

  try {
    // Check if recipient is unsubscribed
    const isUnsubscribed = await prisma.unsubscribe.findUnique({
      where: {
        email_organizationId: {
          email: recipientEmail,
          organizationId,
        },
      },
    });

    if (isUnsubscribed) {
      console.log(`[Worker] Recipient ${recipientEmail} is unsubscribed. Skipping.`);

      // Update recipient status to skipped
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'skipped',
          errorMessage: 'Unsubscribed',
          processedAt: new Date(),
        },
      });

      // Increment skipped count
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          skippedCount: { increment: 1 },
        },
      });

      return;
    }

    // Process PDF attachment if provided
    let pdfAttachmentBytes: Buffer | null = null;
    if (pdfTemplatePath) {
      try {
        const pdfTemplateBytes = await fs.readFile(pdfTemplatePath);
        const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
        // TODO: Implement PDF text replacement if needed
        pdfAttachmentBytes = Buffer.from(await pdfDoc.save());
      } catch (pdfError) {
        console.error(
          `[Worker] PDF processing error for ${recipientEmail}:`,
          pdfError
        );
        throw new Error('PDF processing failed');
      }
    }

    // Personalize template with recipient data
    const personalizedHtml = mergeDataIntoTemplate(templateHtml, recipientData);

    // Personalize subject line
    const personalizedSubject = mergeDataIntoTemplate(subject, recipientData);

    // Generate unsubscribe URL
    const unsubscribeUrl = await generateUnsubscribeUrl(
      recipientEmail,
      organizationId,
      campaignId
    );

    // Add unsubscribe link to email footer
    const htmlWithUnsubscribe = `
      ${personalizedHtml}
      <br><br>
      <div style="font-size: 11px; color: #666; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p>
          If you no longer wish to receive these emails, you can
          <a href="${unsubscribeUrl}" style="color: #666; text-decoration: underline;">unsubscribe here</a>.
        </p>
      </div>
    `;

    // Prepare attachments
    const attachments: Array<{
      content: string;
      filename: string;
      type: string;
      disposition: 'attachment' | 'inline';
    }> = [];

    if (pdfAttachmentBytes) {
      attachments.push({
        content: pdfAttachmentBytes.toString('base64'),
        filename: `attachment_${recipientEmail.split('@')[0]}.pdf`,
        type: 'application/pdf',
        disposition: 'attachment',
      });
    }

    // Prepare email message
    const msg = {
      to: recipientEmail,
      from: { email: fromEmail, name: fromName || undefined },
      replyTo: replyToEmail,
      subject: personalizedSubject,
      html: htmlWithUnsubscribe,
      attachments,
      // Add List-Unsubscribe header for email clients
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    // Send email via configured adapter
    const result = await emailAdapter.send(msg);

    if (!result.success) {
      throw new Error(result.error || 'Email send failed');
    }

    console.log(
      `[Worker] Email sent successfully to ${recipientEmail} (Message ID: ${result.messageId})`
    );

    // Update recipient status to sent with message ID
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'sent',
        messageId: result.messageId || null,
        errorMessage: null,
        processedAt: new Date(),
      },
    });

    // Increment sent count
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        sentCount: { increment: 1 },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Worker] Failed to send email to ${recipientEmail}:`, errorMessage);

    // Update recipient status to failed
    await prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: {
        status: 'failed',
        errorMessage,
        processedAt: new Date(),
      },
    });

    // Increment failed count
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        failedCount: { increment: 1 },
      },
    });

    // Re-throw error to trigger BullMQ retry
    throw error;
  }
}

/**
 * Email processor worker
 * Processes jobs from the email-campaign queue
 */
export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL_CAMPAIGN,
  processEmailJob,
  {
    connection: createRedisConnection(),
    concurrency: 10, // Process up to 10 emails concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // Per second (respect SendGrid rate limits)
    },
  }
);

// Event listeners
emailWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
  console.error(`[Worker] Attempts: ${job?.attemptsMade}/${job?.opts.attempts}`);
});

emailWorker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('[Worker] Received SIGINT, closing worker...');
  await emailWorker.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Received SIGTERM, closing worker...');
  await emailWorker.close();
  process.exit(0);
});

console.log(`[Worker] Email processor worker started (PID: ${process.pid})`);
console.log(`[Worker] Listening to queue: ${QUEUE_NAMES.EMAIL_CAMPAIGN}`);
console.log(`[Worker] Concurrency: 10, Rate limit: 100/sec`);
