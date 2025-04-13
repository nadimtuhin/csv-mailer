import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import sgMail from '@sendgrid/mail';
import fs from 'fs/promises';
// import path from 'path'; // No longer needed here as validation moved to campaign creation
import { PDFDocument } from 'pdf-lib';
import { mergeDataIntoTemplate } from '@/utils/templateHelper'; // Import the actual helper
import type { Campaign, CampaignRecipient } from '@prisma/client'; // Import Prisma types

// Ensure SendGrid API Key is set
if (!process.env.SENDGRID_API_KEY) {
  console.error('FATAL ERROR: SENDGRID_API_KEY environment variable is not set.');
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Define type for SendGrid attachment object (duplicate for now, move to shared types later)
type SendGridAttachment = {
    content: string; filename: string; type: string; disposition: 'attachment' | 'inline'; content_id?: string;
};

// POST /api/campaigns/[campaignId]/process - Process recipients for a campaign
// Accepts optional body: { retryFailed: true } to process failed instead of pending
export async function POST(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  const campaignId = params.campaignId;
  let retryFailed = false;

  // Check request body for retry flag
  try {
      const body = await request.json();
      if (body && body.retryFailed === true) {
          retryFailed = true;
           console.log(`Retrying failed recipients for campaign ${campaignId}...`);
       }
   } catch { // Remove the unused 'e' variable
       // Ignore error if body is empty or not JSON (default to processing pending)
   }

  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json({ message: 'Server configuration error: SendGrid API Key missing.' }, { status: 500 });
  }

  let campaign: Campaign | null = null; // Explicitly type campaign
  try {
    // 1. Fetch Campaign Details (including config)
    campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return NextResponse.json({ message: 'Campaign not found.' }, { status: 404 });
    }

    if (campaign.status === 'processing' || campaign.status === 'completed') {
        // Avoid processing if already running or completed (simple lock mechanism)
        console.log(`Campaign ${campaignId} is already ${campaign.status}. Skipping process request.`);
        return NextResponse.json({ message: `Campaign already ${campaign.status}.` }, { status: 409 }); // 409 Conflict
    }

    // Mark campaign as processing
    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'processing', updatedAt: new Date() },
    });

    // 2. Fetch Template HTML (if stored by ID) - Assuming HTML is passed for now
    // For simplicity, we assume templateHtml is stored directly or passed correctly.
    // If using templateId, fetch Template here:
    // const template = await prisma.template.findUnique({ where: { id: campaign.templateId } });
    // const templateHtml = template?.htmlContent;
    // TODO: Fetch the actual template HTML based on campaign.templateId
    // This requires joining or a separate query. For now, assume templateHtml was stored or passed.
    // If fetching:
    const template = campaign.templateId ? await prisma.template.findUnique({ where: { id: campaign.templateId } }) : null;
    const templateHtml = template?.htmlContent; // Get HTML from fetched template

    if (!templateHtml) {
        // Could not find template content, fail the campaign processing step
         await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'failed' } });
         throw new Error(`Template content not found for campaign ${campaignId} (Template ID: ${campaign.templateId})`);
    }


    // 3. Fetch Recipients to Process (Pending or Failed based on retry flag)
    const statusToProcess = retryFailed ? 'failed' : 'pending';
    const recipientsToProcess = await prisma.campaignRecipient.findMany({
      where: {
        campaignId: campaignId,
        status: statusToProcess,
      },
      take: 100, // Process in batches
    });

    if (recipientsToProcess.length === 0) {
        const message = `No ${statusToProcess} recipients found for campaign ${campaignId}.`;
        console.log(message);
        // Only mark completed if processing 'pending' and none are left
        if (!retryFailed) {
             // Double check if there are *any* pending/failed left before marking completed
             const remainingCount = await prisma.campaignRecipient.count({
                 where: { campaignId: campaignId, status: { in: ['pending', 'failed'] } }
             });
             if (remainingCount === 0) {
                 await prisma.campaign.update({
                     where: { id: campaignId },
                     data: { status: 'completed', updatedAt: new Date() },
                 });
                 console.log(`Campaign ${campaignId} marked as completed.`);
                 // Clean up temp PDF *after* completion
                 if (campaign?.pdfTemplatePath) {
                     try { await fs.unlink(campaign.pdfTemplatePath); console.log(`Cleaned up PDF: ${campaign.pdfTemplatePath}`); }
                     catch (e: unknown) { if (typeof e === 'object' && e !== null && 'code' in e && (e as {code:string}).code !== 'ENOENT') console.error(`Failed PDF cleanup: ${campaign.pdfTemplatePath}`, e); }
                 }
             } else {
                 // If some failed ones remain, don't mark completed yet
                 await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'queued' } }); // Revert to queued? Or keep processing? Depends on desired flow. Let's keep processing for now.
             }
        }
        return NextResponse.json({ message: message });
    }

    console.log(`Processing ${recipientsToProcess.length} recipients for campaign ${campaignId}...`);

    // 4. Process Each Recipient
    let batchSentCount = 0;
    let batchFailedCount = 0;
    // const batchSkippedCount = 0; // Not needed if only processing 'pending'

    const processingPromises = recipientsToProcess.map(async (recipient: CampaignRecipient) => { // Add type
      let pdfAttachmentBytes: Buffer | null = null;
      let finalStatus: 'sent' | 'failed' = 'failed'; // Default to failed unless successful
      let errorMessage: string | null = null;

      try {
        // Ensure campaign object is available (TypeScript guard)
        if (!campaign) throw new Error("Campaign data unavailable during processing.");

        // --- PDF Processing (if applicable) ---
        if (campaign?.pdfTemplatePath) {
          try {
            const pdfTemplateBytes = await fs.readFile(campaign.pdfTemplatePath);
            const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
            // TODO: Implement actual PDF text replacement logic here if possible
            // For now, just uses the loaded bytes
            pdfAttachmentBytes = Buffer.from(await pdfDoc.save());
          } catch (pdfError) {
            console.error(`PDF processing error for ${recipient.recipientEmail}:`, pdfError);
            throw new Error('PDF processing failed'); // Throw to mark recipient as failed
          }
        }
        // --- End PDF Processing ---

        // --- Prepare Email ---
        // TODO: Fetch full recipient data if needed for merge (e.g., from recipient.recipientDataJson)
        // For now, just use email for mergeDataIntoTemplate
        const recipientDataForMerge = { email: recipient.recipientEmail };
        const personalizedHtml = mergeDataIntoTemplate(templateHtml, recipientDataForMerge);
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
        // --- End Prepare Email ---

        // --- Send Email ---
        await sgMail.send(msg);
        finalStatus = 'sent';
        batchSentCount++;
        // --- End Send Email ---

      } catch (error: unknown) {
        finalStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed sending to ${recipient.recipientEmail}:`, errorMessage);
        batchFailedCount++;
      }

      // --- Update Recipient Status ---
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: finalStatus,
          // Clear error message only if retry was successful
          errorMessage: finalStatus === 'sent' ? null : errorMessage,
          processedAt: new Date(),
        },
      });
      // --- End Update Recipient Status ---
    });

    // Wait for all promises in the batch to settle
    await Promise.allSettled(processingPromises);

    // 5. Update Campaign Counts (atomically if possible, though less critical here)
    const updatedCampaign = await prisma.campaign.update({
        where: { id: campaignId },
        data: {
            sentCount: { increment: batchSentCount },
            failedCount: { increment: batchFailedCount },
            // status: 'processing', // Keep as processing until all batches done
            updatedAt: new Date(),
        },
        select: { status: true, totalRecipients: true, sentCount: true, failedCount: true, skippedCount: true } // Select needed fields
    });

    // Check if campaign is complete after this batch
    const totalProcessed = updatedCampaign.sentCount + updatedCampaign.failedCount + updatedCampaign.skippedCount;
     if (totalProcessed >= updatedCampaign.totalRecipients) {
         await prisma.campaign.update({
             where: { id: campaignId },
             data: { status: 'completed', updatedAt: new Date() },
         });
         console.log(`Campaign ${campaignId} marked as completed.`);
         // Cleanup handled here now
     } else {
         // Still more recipients (pending or failed), keep status as 'processing'
         await prisma.campaign.update({
             where: { id: campaignId },
             data: { status: 'processing' }, // Ensure it stays processing
         });
         console.log(`Campaign ${campaignId} batch processed. ${updatedCampaign.totalRecipients - totalProcessed} remaining.`);
         // TODO: Trigger next batch processing if running sequentially
     }


    return NextResponse.json({
        message: `Processed batch for campaign ${campaignId}. Sent: ${batchSentCount}, Failed: ${batchFailedCount}.`,
        remaining: updatedCampaign.totalRecipients - totalProcessed,
        finalStatus: totalProcessed >= updatedCampaign.totalRecipients ? 'completed' : 'processing'
    });

  } catch (error: unknown) {
    console.error(`Error processing campaign ${campaignId}:`, error);
    // Attempt to mark campaign as failed if a major error occurs
    if (campaignId) {
        try {
            await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'failed' } });
        } catch (updateError) {
            console.error(`Failed to mark campaign ${campaignId} as failed:`, updateError);
        }
    }
    return NextResponse.json({ message: 'Internal server error processing campaign.' }, { status: 500 });
  }
}

// Helper function needs to be defined or imported
// Assume it exists in '@/utils/templateHelper'
// export function mergeDataIntoTemplate(template: string, data: any): string { ... }
