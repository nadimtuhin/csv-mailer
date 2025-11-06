import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import prisma from '@/lib/prisma';

// Mock the Prisma client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    template: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Get typed mocks using jest.mocked
const mockFindUnique = jest.mocked(prisma.template.findUnique);
const mockUpdate = jest.mocked(prisma.template.update);

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
