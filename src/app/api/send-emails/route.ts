import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';
import fs from 'fs/promises'; // For reading/deleting temp PDF
import path from 'path';
import os from 'os'; // Needed for tmpdir path validation
import { PDFDocument } from 'pdf-lib'; // Import pdf-lib

// Ensure SendGrid API Key is set in environment variables
// IMPORTANT: Add SENDGRID_API_KEY=your_actual_key to your .env.local file
if (!process.env.SENDGRID_API_KEY) {
  console.error(
    'FATAL ERROR: SENDGRID_API_KEY environment variable is not set.'
  );
  // In a real app, you might want to prevent startup or return a specific error
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailRecipientData {
  email: string; // Expecting at least an 'email' column
  [key: string]: string | number | boolean; // Other columns from CSV
}

interface SendEmailRequestBody {
  recipients: EmailRecipientData[];
  templateHtml: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail: string;
  pdfTemplatePath?: string | null; // Path to the temporary PDF template
}

// Function to replace placeholders like {{column_name}} in HTML
function mergeDataIntoTemplate(
  template: string,
  data: EmailRecipientData
): string {
  let mergedHtml = template;
  // Match {{ column_name }} or {{column_name}}
  const placeholderRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

  mergedHtml = mergedHtml.replace(placeholderRegex, (match, key) => {
    // Check if the key exists in the data object (case-sensitive)
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      return String(data[key]); // Replace with data value
    }
    return match; // Keep the original placeholder if key not found
  });

  return mergedHtml;
}

export async function POST(request: Request) {
  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json(
      { message: 'Server configuration error: SendGrid API Key missing.' },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as SendEmailRequestBody;
    const {
      recipients,
      templateHtml,
      subject,
      fromEmail,
      fromName,
      replyToEmail,
      pdfTemplatePath, // Get the temp PDF path
    } = body;

     // --- PDF Path Validation ---
     if (pdfTemplatePath) {
         try {
             // Security check: Ensure path is within the expected temp directory
             const expectedTmpDir = path.join(os.tmpdir(), 'csvmailer-pdf-templates');
             // Resolve to absolute path and normalize to handle potential '..' etc.
             const resolvedPath = path.resolve(pdfTemplatePath);
             if (!resolvedPath.startsWith(expectedTmpDir)) {
                  console.error(`Attempt to access invalid PDF path: ${pdfTemplatePath} (Resolved: ${resolvedPath})`);
                  throw new Error('Invalid PDF template path location.');
             }
             await fs.access(resolvedPath); // Check if file exists and is accessible
         } catch (err) {
              console.error("Invalid or inaccessible PDF template path:", pdfTemplatePath, err);
              // Return a clear error to the client
              return NextResponse.json({ message: 'Provided PDF template path is invalid or file is inaccessible on the server.' }, { status: 400 });
         }
     }
     // --- End PDF Path Validation ---

    if (
      !recipients ||
      recipients.length === 0 ||
      !templateHtml ||
      !subject ||
      !fromEmail ||
      !replyToEmail
    ) {
      return NextResponse.json(
        { message: 'Missing required fields in request body' },
        { status: 400 }
      );
    }

    // Basic validation for email format (can be enhanced)
    if (!/\S+@\S+\.\S+/.test(fromEmail) || !/\S+@\S+\.\S+/.test(replyToEmail)) {
       return NextResponse.json(
         { message: 'Invalid fromEmail or replyToEmail format' },
         { status: 400 }
       );
    }


    const sendPromises = recipients.map(async (recipient) => {
      if (!recipient.email || !/\S+@\S+\.\S+/.test(recipient.email)) {
        console.warn(`Skipping invalid recipient email: ${recipient.email}`);
        return { email: recipient.email, status: 'skipped', reason: 'Invalid email format' };
      }

      const personalizedHtml = mergeDataIntoTemplate(templateHtml, recipient);
      // Define type for SendGrid attachment object
      type SendGridAttachment = {
        content: string; // Base64 encoded content
        filename: string;
        type: string; // e.g., 'application/pdf'
        disposition: 'attachment' | 'inline';
        content_id?: string; // Optional for inline images
      };
      const attachments: SendGridAttachment[] = []; // Use const and defined type

      // --- PDF Processing Logic ---
      if (pdfTemplatePath) {
        try {
          const pdfTemplateBytes = await fs.readFile(pdfTemplatePath);
          const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
          // const font = await pdfDoc.embedFont(StandardFonts.Helvetica); // Embed font if drawing text

          // ** PDF Text Replacement - VERY DIFFICULT & EXPERIMENTAL **
          // pdf-lib does NOT have a built-in text find/replace function.
          // Replacing text requires finding its exact position and drawing over it,
          // which is complex due to varying PDF structures, fonts, and encodings.
          // This example DOES NOT implement reliable text replacement.
          // It attaches the PDF potentially unmodified or with basic drawing attempts.
          // A robust solution might need different libraries, external services,
          // or carefully prepared PDF templates with known field locations.
          console.warn(`PDF processing for ${recipient.email}: Text replacement is NOT reliably implemented. Attaching PDF as-is or with basic modifications.`);

          // --- Placeholder for potential future replacement logic ---
          // for (const key in recipient) {
          //   const placeholder = `{{${key}}}`;
          //   const replacement = String(recipient[key]);
          //   // TODO: Find placeholder text coordinates and draw replacement text
          //   // Example (highly simplified, likely won't work):
          //   // const pages = pdfDoc.getPages();
          //   // pages[0]?.drawText(replacement, { x: 50, y: 500, font, size: 12 });
          // }
          // --- End Placeholder ---

          // Save the modified document (or original for now) to bytes
          // const modifiedPdfBytes = await pdfDoc.save(); // Use this once replacement works
          const modifiedPdfBytes = await pdfDoc.save(); // Save potentially modified doc

          // Convert to base64 for SendGrid
          const base64Content = Buffer.from(modifiedPdfBytes).toString('base64');

          // Create a dynamic filename based on email/recipient data if desired
          const pdfFilename = `attachment_${recipient.name || recipient.email.split('@')[0] || 'document'}.pdf`;

          attachments.push({
            content: base64Content,
            filename: pdfFilename,
            type: 'application/pdf',
            disposition: 'attachment',
          });

        } catch (pdfError) {
          console.error(`Failed to process PDF for ${recipient.email}:`, pdfError);
          // Decide: skip attachment, fail email, or send without attachment?
          // Let's fail this specific email for now to indicate the PDF issue.
          return { email: recipient.email, status: 'failed', reason: 'PDF processing error' };
        }
      }
      // --- End PDF Processing Logic ---


      const msg = {
        to: recipient.email,
        from: {
          email: fromEmail,
          name: fromName, // Optional: Name displayed to recipient
        },
        replyTo: replyToEmail,
        subject: subject,
        html: personalizedHtml,
        attachments: attachments, // Add the attachments array
      };

      try {
        await sgMail.send(msg);
        return { email: recipient.email, status: 'sent' };
      } catch (error: unknown) {
        // Type guard or assertion might be needed for more specific error handling
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Attempt to access SendGrid specific error details if available
        let detailedError = errorMessage;
        if (typeof error === 'object' && error !== null && 'response' in error) {
          const response = (error as { response?: { body?: unknown } }).response;
          if (response && typeof response === 'object' && 'body' in response) {
             // We can log the body, but avoid returning complex objects in the 'reason' field
             console.error(`SendGrid Error Body for ${recipient.email}:`, response.body);

             // Define a type for the expected SendGrid error structure
             type SendGridErrorDetail = { message: string; field?: string; help?: string };
             type SendGridErrorBody = { errors?: SendGridErrorDetail[] };

             // Optionally, try to extract a message from the body if it's structured
             if (typeof response.body === 'object' && response.body !== null && 'errors' in response.body) {
                 const errorBody = response.body as SendGridErrorBody; // Assert the basic structure
                 if (Array.isArray(errorBody.errors)) {
                     // Map safely, checking if 'e' is an object and has 'message'
                     detailedError = errorBody.errors
                         .map((e: unknown) => {
                             if (typeof e === 'object' && e !== null && 'message' in e) {
                                 return (e as SendGridErrorDetail).message;
                             }
                             return 'Unknown error detail format';
                         })
                         .join(', ');
                 }
             }
          }
        }
        console.error(`Error sending email to ${recipient.email}:`, detailedError);
        return { email: recipient.email, status: 'failed', reason: detailedError };
      }
    });

    // Wait for all emails to be processed (sent or failed)
    const results = await Promise.allSettled(sendPromises);

    // --- Cleanup Temporary PDF ---
    // This should happen *after* all emails using it have been processed by Promise.allSettled
    if (pdfTemplatePath) {
        try {
            // Ensure the path is still valid before attempting deletion
            const expectedTmpDir = path.join(os.tmpdir(), 'csvmailer-pdf-templates');
            const resolvedPath = path.resolve(pdfTemplatePath);
            if (resolvedPath.startsWith(expectedTmpDir)) {
                await fs.unlink(resolvedPath);
                console.log(`Deleted temporary PDF: ${resolvedPath}`);
            } else {
                 console.warn(`Skipping deletion of potentially invalid path: ${pdfTemplatePath}`);
            }
        } catch (cleanupError: unknown) {
            // Log error but don't fail the overall request just for cleanup failure
            // Check if error is because file doesn't exist (already cleaned up?)
            // Check if it's an error object with a 'code' property
            if (typeof cleanupError === 'object' && cleanupError !== null && 'code' in cleanupError) {
                 if ((cleanupError as { code: string }).code !== 'ENOENT') {
                      console.error(`Failed to delete temporary PDF ${pdfTemplatePath}:`, cleanupError);
                 }
            } else {
                 // Log other types of errors
                 console.error(`Failed to delete temporary PDF ${pdfTemplatePath} (unknown error type):`, cleanupError);
            }
        }
    }
    // --- End Cleanup ---


    // Process results to provide a summary
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const detailedResults = results.map(result => {
        if (result.status === 'fulfilled') {
            if (result.value.status === 'sent') successCount++;
            if (result.value.status === 'skipped') skippedCount++;
            if (result.value.status === 'failed') failedCount++;
            return result.value;
        } else {
            // Should not happen with current logic, but handle potential errors
            console.error("Unexpected error in Promise.allSettled:", result.reason);
            // We don't know which email failed here, might need better tracking if this occurs
            return { status: 'error', reason: 'Unknown processing error' };
        }
    });


    console.log(`Email sending complete. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`);

    return NextResponse.json({
      message: `Processing complete. Success: ${successCount}, Failed: ${failedCount}, Skipped: ${skippedCount}`,
      results: detailedResults,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error processing send-emails request:', error);
    return NextResponse.json(
      { message: 'Internal server error', error: errorMessage },
      { status: 500 }
    );
  }
}
