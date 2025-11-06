import { NextRequest } from 'next/server';
import { GET, PATCH } from '../route';
import prisma from '@/lib/prisma';

// Mock the Prisma client
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    campaign: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Get typed mocks
const mockFindUnique = jest.mocked(prisma.campaign.findUnique);
const mockUpdate = jest.mocked(prisma.campaign.update);

describe('GET /api/campaigns/[campaignId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should retrieve campaign details successfully', async () => {
    const mockCampaign = {
      id: 'campaign-id',
      name: 'Test Campaign',
      status: 'completed',
      totalRecipients: 3,
      sentCount: 2,
      failedCount: 1,
      skippedCount: 0,
      subject: 'Test Subject',
      fromEmail: 'sender@example.com',
      fromName: 'Test Sender',
      replyToEmail: 'reply@example.com',
      templateId: 'template-id',
      pdfTemplatePath: null,
      scheduledAt: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      isArchived: false,
      recipients: [
        {
          id: 'recipient-1',
          recipientEmail: 'user1@example.com',
          status: 'sent',
          errorMessage: null,
          processedAt: new Date('2024-01-02'),
        },
        {
          id: 'recipient-2',
          recipientEmail: 'user2@example.com',
          status: 'sent',
          errorMessage: null,
          processedAt: new Date('2024-01-02'),
        },
        {
          id: 'recipient-3',
          recipientEmail: 'user3@example.com',
          status: 'failed',
          errorMessage: 'Invalid email address',
          processedAt: new Date('2024-01-02'),
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockCampaign);

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/campaign-id'
    );
    const context = { params: { campaignId: 'campaign-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.id).toBe('campaign-id');
    expect(data.name).toBe('Test Campaign');
    expect(data.recipients).toHaveLength(3);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'campaign-id' },
      include: {
        recipients: {
          orderBy: [{ status: 'asc' }, { recipientEmail: 'asc' }],
          select: {
            id: true,
            recipientEmail: true,
            status: true,
            errorMessage: true,
            processedAt: true,
          },
        },
      },
    });
  });

  it('should return 400 if campaignId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/campaigns/');
    const context = { params: { campaignId: '' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Campaign ID is required.');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 404 if campaign is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/nonexistent-id'
    );
    const context = { params: { campaignId: 'nonexistent-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Campaign not found.');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'nonexistent-id' },
      include: expect.any(Object),
    });
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/campaign-id'
    );
    const context = { params: { campaignId: 'campaign-id' } };

    const response = await GET(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Database connection error');
  });
});

describe('PATCH /api/campaigns/[campaignId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should archive a campaign successfully', async () => {
    const mockCampaign = {
      isArchived: false,
    };

    mockFindUnique.mockResolvedValue(mockCampaign);
    mockUpdate.mockResolvedValue({
      id: 'campaign-id',
      name: 'Test Campaign',
      status: 'completed',
      totalRecipients: 10,
      sentCount: 10,
      failedCount: 0,
      skippedCount: 0,
      subject: 'Test',
      fromEmail: 'test@example.com',
      fromName: null,
      replyToEmail: 'reply@example.com',
      templateId: null,
      pdfTemplatePath: null,
      scheduledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      isArchived: true,
    });

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/campaign-id',
      { method: 'PATCH' }
    );
    const context = { params: { campaignId: 'campaign-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Campaign archived successfully.');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { id: 'campaign-id' },
      select: { isArchived: true },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'campaign-id' },
      data: { isArchived: true },
    });
  });

  it('should return 400 if campaignId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/campaigns/', {
      method: 'PATCH',
    });
    const context = { params: { campaignId: '' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe('Campaign ID is required.');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 404 if campaign is not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/nonexistent-id',
      { method: 'PATCH' }
    );
    const context = { params: { campaignId: 'nonexistent-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.message).toBe('Campaign not found.');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 200 if campaign is already archived', async () => {
    const mockCampaign = {
      isArchived: true,
    };

    mockFindUnique.mockResolvedValue(mockCampaign);

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/campaign-id',
      { method: 'PATCH' }
    );
    const context = { params: { campaignId: 'campaign-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Campaign is already archived.');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest(
      'http://localhost:3000/api/campaigns/campaign-id',
      { method: 'PATCH' }
    );
    const context = { params: { campaignId: 'campaign-id' } };

    const response = await PATCH(request, context);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Database connection error');
  });
});
