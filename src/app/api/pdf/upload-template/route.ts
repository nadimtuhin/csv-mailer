import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Define a secure temporary directory within the project or use os.tmpdir()
// Using os.tmpdir() is generally safer as it's managed by the OS.
const TMP_DIR = path.join(os.tmpdir(), 'csvmailer-pdf-templates');

// Function to ensure the temporary directory exists
async function ensureTmpDirExists() {
    try {
        await fs.access(TMP_DIR);
    } catch {
        try {
            await fs.mkdir(TMP_DIR, { recursive: true });
            console.log(`Created temporary directory for PDF templates: ${TMP_DIR}`);
        } catch (mkdirError) {
            console.error(`Failed to create temporary directory ${TMP_DIR}:`, mkdirError);
            // Rethrow or handle appropriately if directory creation is critical
            throw new Error('Could not create temporary storage for PDF uploads.');
        }
    }
}

export async function POST(request: Request) {
  try {
    // Ensure the temporary directory exists before processing
    await ensureTmpDirExists();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: 'No file uploaded.' }, { status: 400 });
    }

    // Basic validation for PDF MIME type or extension
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
         return NextResponse.json(
           { message: 'Invalid file type. Please upload a .pdf file.' },
           { status: 400 }
         );
    }

    // Generate a unique temporary filename to avoid collisions
    const uniqueFilename = `template-${crypto.randomUUID()}.pdf`;
    const tempFilePath = path.join(TMP_DIR, uniqueFilename);

    // Read the file content and write to temporary location
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempFilePath, Buffer.from(arrayBuffer));

    console.log(`PDF template saved temporarily to: ${tempFilePath}`);

    // Return the temporary path to the client
    // IMPORTANT: This path is only valid on the server where the API route runs.
    // The client will send this path back when triggering the email send.
    return NextResponse.json({ tempFilePath: tempFilePath });

  } catch (error: unknown) {
    console.error('Error processing PDF template upload:', error);
    const message = error instanceof Error ? error.message : 'Failed to process PDF template.';
    return NextResponse.json(
      { message: message },
      { status: 500 }
    );
  }
}
