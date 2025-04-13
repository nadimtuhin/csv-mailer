import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Handler for PATCH /api/templates/[templateId]/archive - Archive a template
export async function PATCH(
  request: Request, // Changed method to PATCH
  { params }: { params: { templateId: string } }
) {
  const templateId = params.templateId;

  if (!templateId) {
    return NextResponse.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }

  try {
    // Check if the template exists
    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (existingTemplate.isArchived) {
      // Optionally allow unarchiving, or just return success/no-op
      return NextResponse.json(
        { message: 'Template is already archived' },
        { status: 200 } // Or 400 if unarchiving isn't supported here
      );
    }

    // Archive the template by setting isArchived to true
    await prisma.template.update({
      where: { id: templateId },
      data: { isArchived: true }, // Set isArchived flag
    });

    return NextResponse.json(
      { message: 'Template archived successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error archiving template:', error); // Updated log message
    return NextResponse.json(
      { error: 'Failed to archive template' }, // Updated error message
      { status: 500 }
    );
  }
}

// Optional: Add a GET handler if needed later to fetch a single template
// export async function GET(
//   request: Request,
//   { params }: { params: { templateId: string } }
// ) {
//   // ... implementation ...
// }
