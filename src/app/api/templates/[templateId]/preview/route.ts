import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/templates/[templateId]/preview
 * Preview a template with sample data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  const { templateId } = params;

  // Get organizationId from middleware-set header
  const organizationId = request.headers.get('x-organization-id');

  if (!organizationId) {
    return NextResponse.json(
      { message: 'Organization context required' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { sampleData } = body;

    if (!sampleData || typeof sampleData !== 'object') {
      return NextResponse.json(
        { message: 'Sample data object is required' },
        { status: 400 }
      );
    }

    // Fetch the template
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json(
        { message: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify template belongs to user's organization (tenant isolation)
    if (template.organizationId !== organizationId) {
      return NextResponse.json(
        { message: 'Access denied: template belongs to different organization' },
        { status: 403 }
      );
    }

    // Render the template with sample data
    let renderedHtml = template.htmlContent;

    // Replace all template variables with sample data
    // Matches {{variableName}} patterns
    const variableRegex = /\{\{(\w+)\}\}/g;

    renderedHtml = renderedHtml.replace(variableRegex, (match, variableName) => {
      // Check if sample data has this variable
      if (variableName in sampleData) {
        const value = sampleData[variableName];
        // Convert to string and escape HTML to prevent XSS in preview
        if (value === null || value === undefined) {
          return '';
        }
        return escapeHtml(String(value));
      }
      // If variable not found in sample data, leave the placeholder
      return match;
    });

    return NextResponse.json({
      success: true,
      renderedHtml,
      templateName: template.name,
      sampleData,
    });
  } catch (error) {
    console.error('Template preview error:', error);
    return NextResponse.json(
      { message: 'Failed to generate template preview' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to escape HTML to prevent XSS in preview
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
