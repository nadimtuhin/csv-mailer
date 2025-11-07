import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Import the Prisma client instance

import { NextRequest } from 'next/server'; // Import NextRequest for query params
import { sanitizeHTML, sanitizeName } from '@/lib/sanitize';

// GET /api/templates - Retrieve non-archived templates by default (tenant-scoped)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get('includeArchived') === 'true';

  // Get organizationId from middleware-set header (tenant isolation)
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 400 }
    );
  }

  try {
    const templates = await prisma.template.findMany({
      where: {
        organizationId, // CRITICAL: Filter by organization for tenant isolation
        isArchived: includeArchived ? undefined : false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { message: 'Error fetching templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template (tenant-scoped)
export async function POST(request: Request) {
  // Get organizationId from middleware-set header
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 400 }
    );
  }

  try {
    const { name, htmlContent } = (await request.json()) as {
      name: string;
      htmlContent: string;
    };

    if (!name || !htmlContent) {
      return NextResponse.json(
        { message: 'Missing name or htmlContent' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent XSS
    const sanitizedName = sanitizeName(name);
    const sanitizedHtml = sanitizeHTML(htmlContent, 'email');

    // Create template in the database with organizationId
    const newTemplate = await prisma.template.create({
      data: {
        name: sanitizedName,
        htmlContent: sanitizedHtml,
        organizationId, // CRITICAL: Associate with user's organization
      },
    });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { message: 'Error creating template' },
      { status: 500 }
    );
  }
}

// PUT /api/templates - Update an existing template (tenant-scoped)
export async function PUT(request: Request) {
  // Get organizationId from middleware-set header
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 400 }
    );
  }

  try {
    const { id, name, htmlContent } = (await request.json()) as {
      id: string;
      name: string;
      htmlContent: string;
    };

    if (!id || !name || !htmlContent) {
      return NextResponse.json(
        { message: 'Missing id, name, or htmlContent' },
        { status: 400 }
      );
    }

    // Check if the template exists and belongs to user's organization
    const existingTemplate = await prisma.template.findUnique({
      where: { id: id },
    });

    if (!existingTemplate) {
      return NextResponse.json({ message: 'Template not found' }, { status: 404 });
    }

    // CRITICAL: Verify template belongs to user's organization (tenant isolation)
    if (existingTemplate.organizationId !== organizationId) {
      return NextResponse.json(
        { message: 'Access denied: template belongs to different organization' },
        { status: 403 }
      );
    }

    if (existingTemplate.isArchived) {
      return NextResponse.json(
        { message: 'Cannot update an archived template' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent XSS
    const sanitizedName = sanitizeName(name);
    const sanitizedHtml = sanitizeHTML(htmlContent, 'email');

    // Update the template in the database
    const updatedTemplate = await prisma.template.update({
      where: { id: id },
      data: {
        name: sanitizedName,
        htmlContent: sanitizedHtml,
      },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { message: 'Error updating template' },
      { status: 500 }
    );
  }
}


// DELETE /api/templates?id=... - Archive (soft delete) a template (tenant-scoped)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  // Get organizationId from middleware-set header
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 400 }
    );
  }

  if (!id) {
    return NextResponse.json(
      { message: 'Missing template id parameter' },
      { status: 400 }
    );
  }

  try {
    // Check if the template exists and belongs to user's organization
    const existingTemplate = await prisma.template.findUnique({
      where: { id },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      );
    }

    // CRITICAL: Verify template belongs to user's organization (tenant isolation)
    if (existingTemplate.organizationId !== organizationId) {
      return NextResponse.json(
        { message: 'Access denied: template belongs to different organization' },
        { status: 403 }
      );
    }

    if (existingTemplate.isArchived) {
      return NextResponse.json(
        { message: 'Template is already archived' },
        { status: 400 }
      );
    }

    // Soft delete by setting isArchived to true
    const archivedTemplate = await prisma.template.update({
      where: { id },
      data: {
        isArchived: true,
      },
    });

    return NextResponse.json(
      { message: 'Template archived successfully', template: archivedTemplate },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error archiving template:', error);
    return NextResponse.json(
      { message: 'Error archiving template' },
      { status: 500 }
    );
  }
}
