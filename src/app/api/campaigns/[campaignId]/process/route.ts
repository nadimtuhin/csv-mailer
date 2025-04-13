import { NextRequest, NextResponse } from 'next/server'; // Import NextRequest
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
  request: NextRequest,
  { params }: { params: { campaignId: string } } // Standard destructuring for params
) {
  const { campaignId } = params; // Destructure campaignId from params
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

    // Prevent processing only if currently 'processing'
    // Allow retry even if 'completed'
    if (campaign.status === 'processing') {
        console.log(`Campaign ${campaignId} is currently processing. Skipping concurrent request.`);
        return NextResponse.json({ message: `Campaign is currently processing.` }, { status: 409 }); // 409 Conflict
    }

    // If retrying a completed/failed campaign, reset status to processing
    // Otherwise (initial run), set status to processing
    const statusUpdate = (retryFailed && (campaign.status === 'completed' || campaign.status === 'failed'))
      ? 'processing'
      : campaign.status === 'pending' || campaign.status === 'queued'
      ? 'processing'
      : campaign.status; // Keep current status if it's unexpected

    if (statusUpdate === 'processing') {
        await prisma.campaign.update({
            where: { id: campaignId },
            data: { status: 'processing', updatedAt: new Date() },
        });
    } else if (!retryFailed) {
        // If not retrying and status isn't suitable for processing, maybe return an error?
        // For now, let it proceed but this might need refinement.
         console.warn(`Campaign ${campaignId} has status ${campaign.status}, proceeding with initial processing request.`);
         // Optionally, force status to processing here too if needed:
         // await prisma.campaign.update({ where: { id: campaignId }, data: { status: 'processing', updatedAt: new Date() } });
    }

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
                 // Only mark completed if no pending/failed remain
                 await prisma.campaign.update({
                     where: { id: campaignId },
                     data: { status: 'completed', updatedAt: new Date() },
                 });
                 console.log(`Campaign ${campaignId} marked as completed (no pending/failed remain).`);
                 // Clean up temp PDF *after* final completion
                 if (campaign?.pdfTemplatePath) {
                     try { await fs.unlink(campaign.pdfTemplatePath); console.log(`Cleaned up PDF: ${campaign.pdfTemplatePath}`); }
                     catch (e: unknown) { if (typeof e === 'object' && e !== null && 'code' in e && (e as {code:string}).code !== 'ENOENT') console.error(`Failed PDF cleanup: ${campaign.pdfTemplatePath}`, e); }
                 }
             } else {
                 // If some failed ones remain after a retry, mark as 'failed' or keep 'completed'? Let's mark as 'failed' to indicate action might still be needed.
                 // If some failed ones remain after initial run, mark as 'failed'.
                 const finalStatusOnFailures = 'failed'; // Or 'completed_with_errors'
                 await prisma.campaign.update({ where: { id: campaignId }, data: { status: finalStatusOnFailures, updatedAt: new Date() } });
                 console.log(`Campaign ${campaignId} finished with ${remainingCount} pending/failed recipients. Status set to ${finalStatusOnFailures}.`);
             }
        } else if (retryFailed) {
             // If retrying and no failed recipients were found, the message is sufficient.
             // Status should remain as it was (likely 'completed' or 'failed').
        }
        return NextResponse.json({ message: message }); // Return the "No recipients found" message
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
    // Check if campaign is complete after this batch
    const finalRemainingCount = await prisma.campaignRecipient.count({
        where: { campaignId: campaignId, status: { in: ['pending', 'failed'] } }
    });

    let finalCampaignStatus: string;
    if (finalRemainingCount === 0) {
        finalCampaignStatus = 'completed';
        console.log(`Campaign ${campaignId} marked as completed (no pending/failed remain after batch).`);
        // Clean up temp PDF *after* final completion
        if (campaign?.pdfTemplatePath) {
            try { await fs.unlink(campaign.pdfTemplatePath); console.log(`Cleaned up PDF: ${campaign.pdfTemplatePath}`); }
            catch (e: unknown) { if (typeof e === 'object' && e !== null && 'code' in e && (e as {code:string}).code !== 'ENOENT') console.error(`Failed PDF cleanup: ${campaign.pdfTemplatePath}`, e); }
        }
    } else {
        // If still pending/failed, mark as 'failed' (or keep 'processing' if implementing sequential batches)
        finalCampaignStatus = 'failed'; // Indicates incomplete run or errors remain
        console.log(`Campaign ${campaignId} finished batch with ${finalRemainingCount} pending/failed recipients. Status set to ${finalCampaignStatus}.`);
    }

    await prisma.campaign.update({
        where: { id: campaignId },
        data: { status: finalCampaignStatus, updatedAt: new Date() },
    });


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
