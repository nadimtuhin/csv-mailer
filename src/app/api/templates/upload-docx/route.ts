import { NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file uploaded.' },
        { status: 400 }
      );
    }

    // Basic validation for DOCX MIME type or extension
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // 'application/msword' // Mammoth primarily supports .docx
    ];
    // Check type OR extension for flexibility
    const isDocx = allowedTypes.includes(file.type) || file.name.toLowerCase().endsWith('.docx');

    if (!isDocx) {
         return NextResponse.json(
           { message: 'Invalid file type. Please upload a .docx file.' },
           { status: 400 }
         );
    }

    // Read the file content as an ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Convert DOCX buffer to HTML using Mammoth
    // Add options if needed, e.g., styleMap for custom styling
    const result = await mammoth.convertToHtml({ buffer });
    const html = result.value; // The generated HTML
    const messages = result.messages; // Any messages/warnings during conversion

    if (messages && messages.length > 0) {
        console.warn('Mammoth conversion messages:', messages);
        // Optionally include messages in the response if needed
    }

    // Return only the HTML content
    return NextResponse.json({ htmlContent: html });

  } catch (error: unknown) {
    console.error('Error processing DOCX upload:', error);
    const message = error instanceof Error ? error.message : 'Failed to process DOCX file.';
     // Check for Mammoth-specific errors if possible (Mammoth might throw standard errors)
     if (message.includes('expected central directory file header signature')) {
        // This specific error often indicates a non-ZIP file (like not a DOCX)
        return NextResponse.json(
          { message: 'Uploaded file is not a valid DOCX file (Invalid Signature).' },
          { status: 400 }
        );
     }
    return NextResponse.json(
      { message: 'Error converting DOCX to HTML.' },
      { status: 500 }
    );
  }
}
