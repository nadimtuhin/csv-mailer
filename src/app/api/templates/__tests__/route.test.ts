import { NextRequest } from 'next/server';
import { GET, POST, PUT, DELETE } from '../route';
import prisma from '@/lib/prisma';

// Mock the Prisma client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    template: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Get typed mocks using jest.mocked
const mockFindMany = jest.mocked(prisma.template.findMany);
const mockFindUnique = jest.mocked(prisma.template.findUnique);
const mockCreate = jest.mocked(prisma.template.create);
const mockUpdate = jest.mocked(prisma.template.update);

describe('GET /api/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve non-archived templates by default', async () => {
    const mockTemplates = [
      {
        id: 'template-1',
        name: 'Template 1',
        htmlContent: '<p>Content 1</p>',
        isArchived: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 'template-2',
        name: 'Template 2',
        htmlContent: '<p>Content 2</p>',
        isArchived: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    mockFindMany.mockResolvedValue(mockTemplates);

    const request = new NextRequest('http://localhost:3000/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: 'template-1',
      name: 'Template 1',
      htmlContent: '<p>Content 1</p>',
      isArchived: false,
    });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should include archived templates when includeArchived=true', async () => {
    const mockTemplates = [
      {
        id: 'template-1',
        name: 'Template 1',
        htmlContent: '<p>Content 1</p>',
        isArchived: false,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
      },
      {
        id: 'template-3',
        name: 'Archived Template',
        htmlContent: '<p>Archived</p>',
        isArchived: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ];

    mockFindMany.mockResolvedValue(mockTemplates);

    const request = new NextRequest(
      'http://localhost:3000/api/templates?includeArchived=true'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].isArchived).toBe(false);
    expect(data[1].isArchived).toBe(true);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isArchived: undefined },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('should return 500 if there is a database error', async () => {
    mockFindMany.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest('http://localhost:3000/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Error fetching templates');
  });
});

describe('POST /api/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new template successfully', async () => {
    const newTemplateData = {
      name: 'New Template',
      htmlContent: '<p>New Content</p>',
    };

    const createdTemplate = {
      id: 'new-template-id',
      ...newTemplateData,
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockCreate.mockResolvedValue(createdTemplate);

    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify(newTemplateData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      id: 'new-template-id',
      name: 'New Template',
      htmlContent: '<p>New Content</p>',
      isArchived: false,
    });
    expect(data.createdAt).toBeDefined();
    expect(data.updatedAt).toBeDefined();
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: newTemplateData.name,
        htmlContent: newTemplateData.htmlContent,
      },
    });
  });

  it('should return 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify({ htmlContent: '<p>Content</p>' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Missing name or htmlContent');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return 400 if htmlContent is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Template Name' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Missing name or htmlContent');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a database error', async () => {
    mockCreate.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Template',
        htmlContent: '<p>Content</p>',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Error creating template');
  });
});

describe('PUT /api/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update a template successfully', async () => {
    const existingTemplate = {
      id: 'template-id',
      name: 'Old Name',
      htmlContent: '<p>Old Content</p>',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updateData = {
      id: 'template-id',
      name: 'Updated Name',
      htmlContent: '<p>Updated Content</p>',
    };

    const updatedTemplate = {
      ...existingTemplate,
      name: updateData.name,
      htmlContent: updateData.htmlContent,
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(updatedTemplate);

    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      id: 'template-id',
      name: 'Updated Name',
      htmlContent: '<p>Updated Content</p>',
      isArchived: false,
    });
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'template-id' },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'template-id' },
      data: {
        name: updateData.name,
        htmlContent: updateData.htmlContent,
      },
    });
  });

  it('should return 400 if id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Name',
        htmlContent: '<p>Content</p>',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Missing id, name, or htmlContent');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 400 if name is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'template-id',
        htmlContent: '<p>Content</p>',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Missing id, name, or htmlContent');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 400 if htmlContent is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'template-id',
        name: 'Name',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Missing id, name, or htmlContent');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 404 if template is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'nonexistent-id',
        name: 'Name',
        htmlContent: '<p>Content</p>',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Template not found');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 400 if template is archived', async () => {
    const archivedTemplate = {
      id: 'template-id',
      name: 'Archived Template',
      htmlContent: '<p>Content</p>',
      isArchived: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(archivedTemplate);

    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'template-id',
        name: 'New Name',
        htmlContent: '<p>New Content</p>',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Cannot update an archived template');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest('http://localhost:3000/api/templates', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'template-id',
        name: 'Name',
        htmlContent: '<p>Content</p>',
      }),
    });

    const response = await PUT(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Error updating template');
  });
});

describe('DELETE /api/templates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should archive a template successfully', async () => {
    const mockTemplate = {
      id: 'test-template-id',
      name: 'Test Template',
      htmlContent: '<p>Test</p>',
      isArchived: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const archivedTemplate = {
      ...mockTemplate,
      isArchived: true,
    };

    mockFindUnique.mockResolvedValue(mockTemplate);
    mockUpdate.mockResolvedValue(archivedTemplate);

    const request = new NextRequest(
      'http://localhost:3000/api/templates?id=test-template-id'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Template archived successfully');
    expect(data.template.isArchived).toBe(true);
    expect(prisma.template.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-template-id' },
    });
    expect(prisma.template.update).toHaveBeenCalledWith({
      where: { id: 'test-template-id' },
      data: { isArchived: true },
    });
  });

  it('should return 400 if template id is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/templates');

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Missing template id parameter');
    expect(prisma.template.findUnique).not.toHaveBeenCalled();
  });

  it('should return 404 if template is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/templates?id=nonexistent-id'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Template not found');
    expect(prisma.template.findUnique).toHaveBeenCalledWith({
      where: { id: 'nonexistent-id' },
    });
    expect(prisma.template.update).not.toHaveBeenCalled();
  });

  it('should return 400 if template is already archived', async () => {
    const mockTemplate = {
      id: 'test-template-id',
      name: 'Test Template',
      htmlContent: '<p>Test</p>',
      isArchived: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(mockTemplate);

    const request = new NextRequest(
      'http://localhost:3000/api/templates?id=test-template-id'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Template is already archived');
    expect(prisma.template.update).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(
      new Error('Database connection error')
    );

    const request = new NextRequest(
      'http://localhost:3000/api/templates?id=test-template-id'
    );

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Error archiving template');
  });
});
