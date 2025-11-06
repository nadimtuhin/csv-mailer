import { NextRequest } from 'next/server';
import { GET, PUT, PATCH } from '../route';
import prisma from '@/lib/prisma';

// Mock the Prisma client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    template: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Get typed mocks
const mockFindFirst = jest.mocked(prisma.template.findFirst);
const mockFindUnique = jest.mocked(prisma.template.findUnique);
const mockUpdate = jest.mocked(prisma.template.update);

// Test organization ID (multi-tenancy)
const TEST_ORG_ID = 'test-org-123';

// Helper to create NextRequest with required headers for multi-tenancy
function createAuthenticatedRequest(url: string, options?: RequestInit): NextRequest {
  const request = new NextRequest(url, options);
  // Mock the middleware-injected header
  request.headers.set('x-organization-id', TEST_ORG_ID);
  return request;
}

describe('GET /api/templates/[templateId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve a template by ID successfully', async () => {
    const mockTemplate = {
      id: 'template-id',
      name: 'Test Template',
      htmlContent: '<p>Test Content</p>',
      isArchived: false,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindFirst.mockResolvedValue(mockTemplate);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id'
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('template-id');
    expect(data.name).toBe('Test Template');
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        id: 'template-id',
        organizationId: TEST_ORG_ID,
        isArchived: false,
      },
    });
  });

  it('should return 400 if templateId is missing', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/templates/');
    const context = { params: { templateId: '' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Template ID is required');
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('should return 404 if template is not found', async () => {
    mockFindFirst.mockResolvedValue(null);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/nonexistent-id'
    );
    const context = { params: { templateId: 'nonexistent-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found or is archived');
  });

  it('should not retrieve archived templates', async () => {
    mockFindFirst.mockResolvedValue(null); // Archived templates won't be found

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/archived-template-id'
    );
    const context = { params: { templateId: 'archived-template-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found or is archived');
  });

  it('should return 500 if there is a database error', async () => {
    mockFindFirst.mockRejectedValue(new Error('Database connection error'));

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id'
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch template');
  });
});

describe('PUT /api/templates/[templateId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should update a template successfully', async () => {
    const existingTemplate = {
      id: 'template-id',
      name: 'Old Name',
      htmlContent: '<p>Old Content</p>',
      isArchived: false,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedTemplate = {
      ...existingTemplate,
      name: 'New Name',
      htmlContent: '<p>New Content</p>',
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(updatedTemplate);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: 'New Name',
          htmlContent: '<p>New Content</p>',
        }),
      }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.name).toBe('New Name');
    expect(data.htmlContent).toBe('<p>New Content</p>');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'template-id' },
      data: {
        name: 'New Name',
        htmlContent: '<p>New Content</p>',
      },
    });
  });

  it('should return 400 if templateId is missing', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/templates/', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Name',
        htmlContent: '<p>Content</p>',
      }),
    });
    const context = { params: { templateId: '' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Template ID is required');
  });

  it('should return 400 if name is missing', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          htmlContent: '<p>Content</p>',
        }),
      }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 400 if htmlContent is missing', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Name',
        }),
      }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 400 if name is empty', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: '',
          htmlContent: '<p>Content</p>',
        }),
      }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeDefined();
  });

  it('should return 404 if template is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/nonexistent-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Name',
          htmlContent: '<p>Content</p>',
        }),
      }
    );
    const context = { params: { templateId: 'nonexistent-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 400 if template is archived', async () => {
    const archivedTemplate = {
      id: 'template-id',
      name: 'Archived Template',
      htmlContent: '<p>Content</p>',
      isArchived: true,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(archivedTemplate);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: 'New Name',
          htmlContent: '<p>New Content</p>',
        }),
      }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot update an archived template');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Name',
          htmlContent: '<p>Content</p>',
        }),
      }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PUT(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update template');
  });
});

describe('PATCH /api/templates/[templateId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should archive a template successfully', async () => {
    const existingTemplate = {
      id: 'template-id',
      name: 'Test Template',
      htmlContent: '<p>Content</p>',
      isArchived: false,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const archivedTemplate = {
      ...existingTemplate,
      isArchived: true,
    };

    mockFindUnique.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(archivedTemplate);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      { method: 'PATCH' }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Template archived successfully');
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'template-id' },
      data: { isArchived: true },
    });
  });

  it('should return 400 if templateId is missing', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/templates/', {
      method: 'PATCH',
    });
    const context = { params: { templateId: '' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Template ID is required');
  });

  it('should return 404 if template is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/nonexistent-id',
      { method: 'PATCH' }
    );
    const context = { params: { templateId: 'nonexistent-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 200 if template is already archived', async () => {
    const archivedTemplate = {
      id: 'template-id',
      name: 'Archived Template',
      htmlContent: '<p>Content</p>',
      isArchived: true,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(archivedTemplate);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      { method: 'PATCH' }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Template is already archived');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/templates/template-id',
      { method: 'PATCH' }
    );
    const context = { params: { templateId: 'template-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to update template archive status');
  });
});
