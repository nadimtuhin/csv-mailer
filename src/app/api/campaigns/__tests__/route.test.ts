import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import prisma from '@/lib/prisma';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// Mock the Prisma client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    campaign: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    campaignRecipient: {
      createMany: jest.fn(),
    },
  },
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn(),
  unlink: jest.fn(),
}));

// Get typed mocks
const mockFindMany = jest.mocked(prisma.campaign.findMany);
const mockCreate = jest.mocked(prisma.campaign.create);
const mockUpdate = jest.mocked(prisma.campaign.update);
const mockCreateMany = jest.mocked(prisma.campaignRecipient.createMany);
const mockFsAccess = jest.mocked(fs.access);
const mockFsUnlink = jest.mocked(fs.unlink);

// Test organization ID (multi-tenancy)
const TEST_ORG_ID = 'test-org-123';

// Helper to create NextRequest with required headers for multi-tenancy
function createAuthenticatedRequest(url: string, options?: RequestInit): NextRequest {
  const request = new NextRequest(url, options);
  // Mock the middleware-injected header
  request.headers.set('x-organization-id', TEST_ORG_ID);
  return request;
}

describe('GET /api/campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve non-archived campaigns by default', async () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        name: 'Campaign 1',
        status: 'completed',
        totalRecipients: 100,
        sentCount: 95,
        failedCount: 5,
        skippedCount: 0,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        scheduledAt: null,
      },
      {
        id: 'campaign-2',
        name: 'Campaign 2',
        status: 'pending',
        totalRecipients: 50,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        scheduledAt: null,
      },
    ];

    mockFindMany.mockResolvedValue(mockCampaigns);

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].status).toBe('completed');
    expect(mockFindMany).toHaveBeenCalledWith({
      take: undefined,
      where: { organizationId: TEST_ORG_ID, isArchived: false },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        totalRecipients: true,
        sentCount: true,
        failedCount: true,
        skippedCount: true,
        createdAt: true,
        updatedAt: true,
        scheduledAt: true,
      },
    });
  });

  it('should include archived campaigns when includeArchived=true', async () => {
    const mockCampaigns = [
      {
        id: 'campaign-1',
        name: 'Active Campaign',
        status: 'pending',
        totalRecipients: 50,
        sentCount: 0,
        failedCount: 0,
        skippedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        scheduledAt: null,
      },
    ];

    mockFindMany.mockResolvedValue(mockCampaigns);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/campaigns?includeArchived=true'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith({
      take: undefined,
      where: { organizationId: TEST_ORG_ID, isArchived: undefined },
      orderBy: { createdAt: 'desc' },
      select: expect.any(Object),
    });
  });

  it('should limit results when limit parameter is provided', async () => {
    mockFindMany.mockResolvedValue([]);

    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/campaigns?limit=10'
    );
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith({
      take: 10,
      where: { organizationId: TEST_ORG_ID, isArchived: false },
      orderBy: { createdAt: 'desc' },
      select: expect.any(Object),
    });
  });

  it('should return 400 for invalid limit parameter', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/campaigns?limit=invalid'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Invalid limit parameter.');
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  it('should return 400 for negative limit parameter', async () => {
    const request = createAuthenticatedRequest(
      'http://localhost:3000/api/campaigns?limit=-5'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Invalid limit parameter.');
  });

  it('should return 500 if there is a database error', async () => {
    mockFindMany.mockRejectedValue(new Error('Database connection error'));

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Database connection error');
  });
});

describe('POST /api/campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a campaign successfully', async () => {
    const campaignData = {
      recipients: [
        { email: 'user1@example.com', name: 'User 1' },
        { email: 'user2@example.com', name: 'User 2' },
      ],
      templateId: 'template-id',
      templateHtml: '<p>Hello {{name}}</p>',
      subject: 'Test Subject',
      fromEmail: 'sender@example.com',
      fromName: 'Test Sender',
      replyToEmail: 'reply@example.com',
      campaignName: 'Test Campaign',
    };

    const createdCampaign = {
      id: 'campaign-id',
      name: 'Test Campaign',
      status: 'pending',
      totalRecipients: 2,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      subject: 'Test Subject',
      fromEmail: 'sender@example.com',
      fromName: 'Test Sender',
      replyToEmail: 'reply@example.com',
      templateId: 'template-id',
      pdfTemplatePath: null,
      scheduledAt: null,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
    };

    mockCreate.mockResolvedValue(createdCampaign);
    mockCreateMany.mockResolvedValue({ count: 2 });
    mockUpdate.mockResolvedValue(createdCampaign);

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.campaignId).toBe('campaign-id');
    expect(data.status).toBe('queued');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Test Campaign',
        status: 'pending',
        totalRecipients: 2,
        subject: 'Test Subject',
        organizationId: TEST_ORG_ID,
      }),
    });
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ recipientEmail: 'user1@example.com' }),
        expect.objectContaining({ recipientEmail: 'user2@example.com' }),
      ]),
    });
  });

  it('should return 400 if recipients list is empty', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [],
        templateHtml: '<p>Test</p>',
        subject: 'Test',
        fromEmail: 'test@example.com',
        replyToEmail: 'reply@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Recipient list cannot be empty.');
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should return 400 if subject is missing', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [{ email: 'test@example.com' }],
        templateHtml: '<p>Test</p>',
        fromEmail: 'test@example.com',
        replyToEmail: 'reply@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe(
      'Missing required campaign configuration (subject, sender emails).'
    );
  });

  it('should return 400 if fromEmail is missing', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [{ email: 'test@example.com' }],
        templateHtml: '<p>Test</p>',
        subject: 'Test Subject',
        replyToEmail: 'reply@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe(
      'Missing required campaign configuration (subject, sender emails).'
    );
  });

  it('should return 400 if neither templateId nor templateHtml is provided', async () => {
    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [{ email: 'test@example.com' }],
        subject: 'Test Subject',
        fromEmail: 'test@example.com',
        replyToEmail: 'reply@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe(
      'Missing template information (templateId or templateHtml).'
    );
  });

  it('should create a scheduled campaign successfully', async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    const campaignData = {
      recipients: [{ email: 'test@example.com' }],
      templateHtml: '<p>Test</p>',
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      scheduledAt: futureDate,
    };

    const createdCampaign = {
      id: 'campaign-id',
      name: expect.any(String),
      status: 'scheduled',
      totalRecipients: 1,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      scheduledAt: new Date(futureDate),
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: false,
      fromName: null,
      templateId: null,
      pdfTemplatePath: null,
    };

    mockCreate.mockResolvedValue(createdCampaign);
    mockCreateMany.mockResolvedValue({ count: 1 });
    mockUpdate.mockResolvedValue(createdCampaign);

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.status).toBe('scheduled');
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        status: 'scheduled',
        scheduledAt: expect.any(Date),
        organizationId: TEST_ORG_ID,
      }),
    });
  });

  it('should return 400 if scheduled time is in the past', async () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [{ email: 'test@example.com' }],
        templateHtml: '<p>Test</p>',
        subject: 'Test',
        fromEmail: 'test@example.com',
        replyToEmail: 'reply@example.com',
        scheduledAt: pastDate,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Scheduled time must be in the future.');
  });

  it('should filter out invalid email addresses', async () => {
    const campaignData = {
      recipients: [
        { email: 'valid@example.com' },
        { email: 'invalid-email' },
        { email: '' },
      ],
      templateHtml: '<p>Test</p>',
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
    };

    const createdCampaign = {
      id: 'campaign-id',
      name: expect.any(String),
      status: 'pending',
      totalRecipients: 3,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      scheduledAt: null,
      isArchived: false,
      fromName: null,
      templateId: null,
      pdfTemplatePath: null,
    };

    mockCreate.mockResolvedValue(createdCampaign);
    mockCreateMany.mockResolvedValue({ count: 1 }); // Only 1 valid email
    mockUpdate.mockResolvedValue(createdCampaign);

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ recipientEmail: 'valid@example.com' }),
      ]),
    });
    // Should only have 1 recipient (the valid one)
    expect(mockCreateMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it('should return 400 if no valid email addresses after filtering', async () => {
    const campaignData = {
      recipients: [{ email: 'invalid-email' }, { email: '' }],
      templateHtml: '<p>Test</p>',
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
    };

    const createdCampaign = {
      id: 'campaign-id',
      name: expect.any(String),
      status: 'pending',
      totalRecipients: 2,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      scheduledAt: null,
      isArchived: false,
      fromName: null,
      templateId: null,
      pdfTemplatePath: null,
    };

    mockCreate.mockResolvedValue(createdCampaign);
    mockUpdate.mockResolvedValue(createdCampaign);

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe(
      'No valid recipient email addresses found in the provided list.'
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'campaign-id' },
      data: {
        status: 'failed',
        skippedCount: 2,
        totalRecipients: 2,
      },
    });
  });

  it('should validate PDF template path is in correct directory', async () => {
    const validPath = path.join(os.tmpdir(), 'csvmailer-pdf-templates', 'test.pdf');
    const campaignData = {
      recipients: [{ email: 'test@example.com' }],
      templateHtml: '<p>Test</p>',
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      pdfTemplatePath: validPath,
    };

    mockFsAccess.mockResolvedValue(undefined);
    mockCreate.mockResolvedValue({
      id: 'campaign-id',
      name: expect.any(String),
      status: 'pending',
      totalRecipients: 1,
      organizationId: TEST_ORG_ID,
      createdAt: new Date(),
      updatedAt: new Date(),
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      scheduledAt: null,
      isArchived: false,
      fromName: null,
      templateId: null,
      pdfTemplatePath: validPath,
    });
    mockCreateMany.mockResolvedValue({ count: 1 });
    mockUpdate.mockResolvedValue({} as any);

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });

    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(mockFsAccess).toHaveBeenCalled();
  });

  it('should return 400 for invalid PDF template path', async () => {
    const invalidPath = '/etc/passwd'; // Outside of allowed directory
    const campaignData = {
      recipients: [{ email: 'test@example.com' }],
      templateHtml: '<p>Test</p>',
      subject: 'Test',
      fromEmail: 'test@example.com',
      replyToEmail: 'reply@example.com',
      pdfTemplatePath: invalidPath,
    };

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(campaignData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe(
      'Provided PDF template path is invalid or file is inaccessible.'
    );
  });

  it('should return 500 if there is a database error', async () => {
    mockCreate.mockRejectedValue(new Error('Database connection error'));

    const request = createAuthenticatedRequest('http://localhost:3000/api/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        recipients: [{ email: 'test@example.com' }],
        templateHtml: '<p>Test</p>',
        subject: 'Test',
        fromEmail: 'test@example.com',
        replyToEmail: 'reply@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Database connection error');
  });
});
