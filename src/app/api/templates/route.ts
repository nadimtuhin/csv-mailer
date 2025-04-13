import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Import the Prisma client instance

// GET /api/templates - Retrieve all templates
export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: {
        createdAt: 'desc', // Order by creation date, newest first
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

// POST /api/templates - Create a new template
export async function POST(request: Request) {
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

    // Create template in the database
    const newTemplate = await prisma.template.create({
      data: {
        name,
        htmlContent,
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

// PUT /api/templates - Update an existing template
export async function PUT(request: Request) {
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

    // Update the template in the database
    const updatedTemplate = await prisma.template.update({
      where: { id: id },
      data: {
        name,
        htmlContent,
      },
    });

    // Note: prisma.template.update throws an error if the record is not found,
    // so we don't need a separate 404 check here unless we want a custom message.
    // We could wrap this in a try/catch for specific Prisma errors if needed.

    return NextResponse.json(updatedTemplate); // Return updated template
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { message: 'Error updating template' },
      { status: 500 }
    );
  }
}


// TODO: Add DELETE /api/templates?id=... handler later if needed
