import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod'; // Import Zod for validation

// Zod schema for validating the PUT request body
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Template name cannot be empty'),
  htmlContent: z.string().min(1, 'Template content cannot be empty'),
});


// Handler for GET /api/templates/[templateId] - Fetch a single template (tenant-scoped)
export async function GET(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  const templateId = params.templateId;

  // Get organizationId from middleware-set header (tenant isolation)
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
  }

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }

  try {
    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        organizationId, // CRITICAL: Tenant isolation
        isArchived: false,
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found or is archived' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 });
  }
}


// Handler for PUT /api/templates/[templateId] - Update a template (tenant-scoped)
export async function PUT(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  const templateId = params.templateId;

  // Get organizationId from middleware-set header (tenant isolation)
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 400 });
  }

  if (!templateId) {
    return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors }, { status: 400 });
    }

    const { name, htmlContent } = validation.data;

    // Check if template exists and belongs to user's organization
    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // CRITICAL: Verify template belongs to user's organization (tenant isolation)
    if (existingTemplate.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied: template belongs to different organization' },
        { status: 403 }
      );
    }

    if (existingTemplate.isArchived) {
      return NextResponse.json({ error: 'Cannot update an archived template' }, { status: 400 });
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: {
        name: name,
        htmlContent: htmlContent,
      },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}


// Handler for PATCH /api/templates/[templateId] - Archive/Unarchive a template (tenant-scoped)
export async function PATCH(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  const templateId = params.templateId;

  // Get organizationId from middleware-set header (tenant isolation)
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { error: 'Organization context required' },
      { status: 400 }
    );
  }

  if (!templateId) {
    return NextResponse.json(
      { error: 'Template ID is required' },
      { status: 400 }
    );
  }

  try {
    // Check if the template exists and belongs to user's organization
    const existingTemplate = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Verify template belongs to user's organization (tenant isolation)
    if (existingTemplate.organizationId !== organizationId) {
      return NextResponse.json(
        { error: 'Access denied: template belongs to different organization' },
        { status: 403 }
      );
    }

    if (existingTemplate.isArchived) {
      // Optionally allow unarchiving, or just return success/no-op
      return NextResponse.json(
        { message: 'Template is already archived' },
        { status: 200 }
      );
    }

    // Toggle the isArchived status
    const updatedTemplate = await prisma.template.update({
      where: { id: templateId },
      data: { isArchived: !existingTemplate.isArchived },
    });

    const message = updatedTemplate.isArchived
      ? 'Template archived successfully'
      : 'Template unarchived successfully';

    return NextResponse.json({ message }, { status: 200 });
  } catch (error) {
    console.error('Error updating template archive status:', error);
    return NextResponse.json(
      { error: 'Failed to update template archive status' },
      { status: 500 }
    );
  }
}
