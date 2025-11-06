import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import path from 'path'; // Keep for path validation if needed
import os from 'os';   // Keep for path validation if needed
import { NextRequest } from 'next/server'; // Import NextRequest
import fs from 'fs/promises'; // Keep for path validation if needed

// Interface for the request body to create a campaign
interface RecipientData {
  email: string;
  [key: string]: unknown; // Use unknown instead of any for better type safety
}
interface CreateCampaignRequestBody {
  recipients: RecipientData[]; // Use the defined type
  templateId?: string;
  templateHtml: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail: string;
  pdfTemplatePath?: string | null; // Path to the temporary PDF template
  campaignName?: string; // Optional name for the campaign
  scheduledAt?: string | null; // Optional ISO string for scheduling
}

// GET /api/campaigns - List non-archived campaigns by default, supports limit
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    // Validate limit if provided
    if (limit !== undefined && (isNaN(limit) || limit <= 0)) {
        return NextResponse.json({ message: 'Invalid limit parameter.' }, { status: 400 });
    }

    try {
        const campaigns = await prisma.campaign.findMany({
            take: limit, // Add take for limiting results
            where: {
                isArchived: includeArchived ? undefined : false, // Filter out archived unless requested
            },
            orderBy: {
                createdAt: 'desc', // Show newest first
            },
            select: { // Select only necessary summary fields
                id: true,
                name: true,
                status: true,
                totalRecipients: true,
                sentCount: true,
                failedCount: true,
                skippedCount: true,
                createdAt: true,
                updatedAt: true,
                scheduledAt: true, // Add scheduledAt to the selection
            }
        });
        return NextResponse.json(campaigns);
    } catch (error: unknown) {
        console.error('Error fetching campaigns:', error);
        const message = error instanceof Error ? error.message : 'Internal server error fetching campaigns.';
        return NextResponse.json({ message }, { status: 500 });
    }
}


// POST /api/campaigns - Create a new campaign and queue recipients
export async function POST(request: Request) {
  let validatedPdfPath: string | null = null; // Declare outside try block
  try {
    const body = (await request.json()) as CreateCampaignRequestBody;
    const {
      recipients,
      templateId, // Get template ID if passed
      templateHtml, // Keep HTML for now, could fetch via templateId
      subject,
      fromEmail,
      fromName,
      replyToEmail,
      pdfTemplatePath,
      campaignName,
      scheduledAt: scheduledAtString, // Rename to avoid conflict with Date object
    } = body;

    // --- Basic Validation ---
    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ message: 'Recipient list cannot be empty.' }, { status: 400 });
    }
    if (!subject || !fromEmail || !replyToEmail) {
      return NextResponse.json({ message: 'Missing required campaign configuration (subject, sender emails).' }, { status: 400 });
    }
     // Validate template source: require either templateId or templateHtml (or fetch if only ID)
     if (!templateId && !templateHtml) {
         // If templateId is provided but fetching fails later, the process route handles it.
         // If neither is provided, it's an invalid request here.
         // This check assumes templateHtml is passed directly for now. Adjust if fetching by ID.
         return NextResponse.json({ message: 'Missing template information (templateId or templateHtml).' }, { status: 400 });
     }

    // --- Schedule Validation ---
    let scheduledAt: Date | null = null;
    if (scheduledAtString) {
        try {
            scheduledAt = new Date(scheduledAtString);
            if (isNaN(scheduledAt.getTime())) {
                throw new Error('Invalid date format.');
            }
            if (scheduledAt <= new Date()) {
                throw new Error('Scheduled time must be in the future.');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Invalid scheduled time provided.';
            return NextResponse.json({ message }, { status: 400 });
        }
    }
    // --- End Schedule Validation ---

    // --- PDF Path Validation (copied from previous step) ---
    // validatedPdfPath is declared outside, assign here
    if (pdfTemplatePath) {
        try {
            const expectedTmpDir = path.join(os.tmpdir(), 'csvmailer-pdf-templates');
            const resolvedPath = path.resolve(pdfTemplatePath);
            if (!resolvedPath.startsWith(expectedTmpDir)) {
                 throw new Error('Invalid PDF template path location.');
            }
            await fs.access(resolvedPath);
            validatedPdfPath = pdfTemplatePath; // Use the original path passed if valid
        } catch (err) {
             console.error("Invalid or inaccessible PDF template path during campaign creation:", pdfTemplatePath, err);
             return NextResponse.json({ message: 'Provided PDF template path is invalid or file is inaccessible.' }, { status: 400 });
        }
    }
    // --- End PDF Path Validation ---


    // --- Create Campaign in Database ---
    const initialStatus = scheduledAt ? 'scheduled' : 'pending'; // Set initial status based on scheduling
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName || `Campaign ${new Date().toISOString()}`, // Default name
        status: initialStatus, // Use determined initial status
        totalRecipients: recipients.length,
        subject: subject,
        fromEmail: fromEmail,
        fromName: fromName,
        replyToEmail: replyToEmail,
        templateId: templateId, // Store template ID if available
        pdfTemplatePath: validatedPdfPath, // Store validated path
        scheduledAt: scheduledAt, // Store the Date object or null
        // Store template HTML directly on campaign if not using templateId relation rigorously
        // templateHtml: templateHtml, // Uncomment if storing HTML on campaign model
      },
    });
    // --- End Create Campaign ---


    // --- Create Campaign Recipient Records ---
    // Prepare data for bulk creation
    const recipientData = recipients
        .filter(r => r.email && typeof r.email === 'string' && /\S+@\S+\.\S+/.test(r.email)) // Basic email validation
        .map(recipient => ({
            campaignId: campaign.id,
            recipientEmail: recipient.email,
            status: 'pending', // Initial status for each recipient
            // Optionally store recipient-specific data from CSV row if needed for retry/PDFs
            // recipientDataJson: JSON.stringify(recipient),
        }));

    if (recipientData.length === 0) {
        // Handle case where no valid emails were found after filtering
        await prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'failed', skippedCount: recipients.length, totalRecipients: recipients.length }, // Mark campaign as failed immediately
        });
        // Clean up temp PDF if creation fails early
        if (validatedPdfPath) {
             try { await fs.unlink(validatedPdfPath); } catch (e) { console.error("Cleanup failed:", e); }
        }
        return NextResponse.json({ message: 'No valid recipient email addresses found in the provided list.' }, { status: 400 });
    }

    // Use Prisma's createMany for efficiency
    const createManyResult = await prisma.campaignRecipient.createMany({
      data: recipientData,
      // skipDuplicates: true, // Not supported by SQLite
    });

    // Update campaign counts based on actual created recipients vs original total
    const skippedCount = recipients.length - createManyResult.count;
    // Determine final status after recipient creation
    const finalStatus = scheduledAt ? 'scheduled' : 'queued';
    await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
            status: finalStatus, // Update status based on scheduling
            skippedCount: skippedCount,
            totalRecipients: recipients.length, // Keep total as original count
        },
    });
    // --- End Create Campaign Recipient Records ---


    // --- Trigger Background Processing (Simulated) ---
    // In a real app, you'd enqueue a job here (e.g., BullMQ, Quirrel, Inngest)
    // For now, we just return the campaign ID. Processing needs a separate trigger.
    console.log(`Campaign ${campaign.id} created and recipients queued. Trigger processing separately.`);
    // --- End Trigger Background Processing ---


    // Return the newly created campaign ID and initial status
    const successMessage = scheduledAt
        ? `Campaign scheduled successfully for ${scheduledAt.toLocaleString()} with ID: ${campaign.id}. ${createManyResult.count} recipients queued, ${skippedCount} skipped.`
        : `Campaign created successfully with ID: ${campaign.id}. ${createManyResult.count} recipients queued, ${skippedCount} skipped.`;

    return NextResponse.json({
        message: successMessage,
        campaignId: campaign.id,
        status: finalStatus // Return the final status
    }, { status: 201 }); // 201 Created

  } catch (error: unknown) {
    console.error('Error creating campaign:', error);
    // Consider more specific error handling (e.g., Prisma errors)
    const message = error instanceof Error ? error.message : 'Internal server error creating campaign.';
    // Clean up temp PDF if creation fails - Need to read body carefully in error handler
    // Cloning the request body might be unreliable here. Best effort cleanup.
    // We already have `validatedPdfPath` if validation passed before the error.
     if (validatedPdfPath) { // Use the path validated earlier if available
         try {
             await fs.unlink(validatedPdfPath);
             console.log(`Cleaned up PDF ${validatedPdfPath} after campaign creation error.`);
         } catch (e: unknown) { // Use unknown for error type
              if (typeof e === 'object' && e !== null && 'code' in e) {
                  if ((e as { code: string }).code !== 'ENOENT') { // File not found is ok
                       console.error("Cleanup failed:", e);
                  }
              } else {
                   console.error("Cleanup failed (unknown error type):", e);
              }
         }
     }
    return NextResponse.json(
      { message: message },
      { status: 500 }
    );
  }
}
