import { NextRequest } from 'next/server';
import * as googleOAuth from '@/lib/googleOAuth';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Mock modules
jest.mock('@/lib/googleOAuth');
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userOrganization: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  },
}));
jest.mock('jsonwebtoken');

const mockGetTokensFromCode = jest.mocked(googleOAuth.getTokensFromCode);
const mockGetUserInfo = jest.mocked(googleOAuth.getUserInfo);
const mockUserFindUnique = jest.mocked(prisma.user.findUnique);
const mockUserCreate = jest.mocked(prisma.user.create);
const mockUserUpdate = jest.mocked(prisma.user.update);
const mockOrgFindUnique = jest.mocked(prisma.organization.findUnique);
const mockOrgCreate = jest.mocked(prisma.organization.create);
const mockUserOrgCreate = jest.mocked(prisma.userOrganization.create);
const mockTransaction = jest.mocked(prisma.$transaction);
const mockJwtSign = jest.mocked(jwt.sign);

describe('GET /api/auth/google/callback', () => {
  const originalEnv = process.env.JWT_SECRET;
  let GET: any;

  beforeAll(async () => {
    // Set JWT_SECRET before importing route
    process.env.JWT_SECRET = 'test-secret-key';

    // Dynamically import route after setting env
    const module = await import('../route');
    GET = module.GET;
  });

  afterAll(() => {
    // Restore original
    process.env.JWT_SECRET = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully authenticate and create new user', async () => {
    const mockTokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    };

    const mockGoogleUser = {
      id: 'google-user-id',
      email: 'newuser@example.com',
      name: 'New User',
      picture: 'https://example.com/photo.jpg',
      verified_email: true,
    };

    const mockCreatedUser = {
      id: 'user-id',
      email: 'newuser@example.com',
      password: 'oauth_random_string',
      googleId: 'google-user-id',
      name: 'New User',
      picture: 'https://example.com/photo.jpg',
      authProvider: 'google',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockOrganization = {
      id: 'org-id',
      name: "New User's Organization",
      slug: 'newuser',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUserWithOrgs = {
      ...mockCreatedUser,
      organizations: [
        {
          id: 'user-org-1',
          userId: 'user-id',
          organizationId: 'org-id',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: mockOrganization,
        },
      ],
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);

    // First call: check if user exists (returns null for new user)
    // Second call: fetch user with organizations
    mockUserFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockUserWithOrgs);

    mockOrgFindUnique.mockResolvedValue(null); // Slug is available

    // Mock transaction to execute callback
    mockTransaction.mockImplementation(async (callback: any) => {
      const txClient = {
        user: { create: mockUserCreate },
        organization: { create: mockOrgCreate },
        userOrganization: { create: mockUserOrgCreate },
      };
      return callback(txClient);
    });

    mockUserCreate.mockResolvedValue(mockCreatedUser);
    mockOrgCreate.mockResolvedValue(mockOrganization);
    mockUserOrgCreate.mockResolvedValue({} as any);
    mockJwtSign.mockReturnValue('mock-jwt-token' as any);

    const state = JSON.stringify({ redirectTo: '/dashboard', timestamp: Date.now() });
    const request = new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=auth-code&state=${encodeURIComponent(state)}`
    );

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect
    expect(response.headers.get('location')).toContain('/dashboard');
    expect(mockGetTokensFromCode).toHaveBeenCalledWith('auth-code');
    expect(mockGetUserInfo).toHaveBeenCalledWith('mock-access-token');

    // First call: check if user exists
    expect(mockUserFindUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'newuser@example.com' },
    });
    // Second call: fetch user with organizations
    expect(mockUserFindUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 'user-id' },
      include: {
        organizations: {
          include: {
            organization: true,
          },
          orderBy: {
            role: 'asc',
          },
        },
      },
    });

    expect(mockJwtSign).toHaveBeenCalledWith(
      {
        userId: 'user-id',
        email: 'newuser@example.com',
        organizationId: 'org-id',
        authMethod: 'google',
      },
      'test-secret-key',
      { expiresIn: '1d' }
    );

    // Check cookie was set
    const cookies = response.cookies.getAll();
    const authCookie = cookies.find((c) => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBe('mock-jwt-token');
  });

  it('should authenticate existing user and link Google account', async () => {
    const mockTokens = {
      access_token: 'mock-access-token',
    };

    const mockGoogleUser = {
      id: 'google-user-id',
      email: 'existing@example.com',
      name: 'Existing User',
      picture: 'https://example.com/photo.jpg',
      verified_email: true,
    };

    const mockExistingUser = {
      id: 'existing-user-id',
      email: 'existing@example.com',
      password: 'hashed-password',
      googleId: null, // No googleId, so account should be linked
      name: null,
      picture: null,
      authProvider: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUpdatedUser = {
      ...mockExistingUser,
      googleId: 'google-user-id',
      name: 'Existing User',
      picture: 'https://example.com/photo.jpg',
      authProvider: 'google',
    };

    const mockUserWithOrgs = {
      ...mockUpdatedUser,
      organizations: [
        {
          id: 'user-org-1',
          userId: 'existing-user-id',
          organizationId: 'org-id',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: { id: 'org-id', name: 'Org', slug: 'org', createdAt: new Date(), updatedAt: new Date() },
        },
      ],
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockUserFindUnique
      .mockResolvedValueOnce(mockExistingUser)
      .mockResolvedValueOnce(mockUserWithOrgs);
    mockUserUpdate.mockResolvedValue(mockUpdatedUser);
    mockJwtSign.mockReturnValue('mock-jwt-token' as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(mockUserFindUnique).toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled(); // Should not create new user
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'existing-user-id' },
      data: {
        googleId: 'google-user-id',
        name: 'Existing User',
        picture: 'https://example.com/photo.jpg',
        authProvider: 'google',
      },
    });
    expect(mockJwtSign).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'existing-user-id',
        email: 'existing@example.com',
      }),
      expect.any(String),
      expect.any(Object)
    );
  });

  it('should authenticate user with already-linked Google account', async () => {
    const mockTokens = {
      access_token: 'mock-access-token',
    };

    const mockGoogleUser = {
      id: 'google-user-id',
      email: 'linked@example.com',
      name: 'Linked User',
      picture: 'https://example.com/photo.jpg',
      verified_email: true,
    };

    const mockLinkedUser = {
      id: 'linked-user-id',
      email: 'linked@example.com',
      password: 'hashed-password',
      googleId: 'google-user-id', // Already has googleId
      name: 'Linked User',
      picture: 'https://example.com/photo.jpg',
      authProvider: 'google',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUserWithOrgs = {
      ...mockLinkedUser,
      organizations: [
        {
          id: 'user-org-1',
          userId: 'linked-user-id',
          organizationId: 'org-id',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: { id: 'org-id', name: 'Org', slug: 'org', createdAt: new Date(), updatedAt: new Date() },
        },
      ],
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockUserFindUnique
      .mockResolvedValueOnce(mockLinkedUser)
      .mockResolvedValueOnce(mockUserWithOrgs);
    mockJwtSign.mockReturnValue('mock-jwt-token' as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(mockUserFindUnique).toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled();
    expect(mockUserUpdate).not.toHaveBeenCalled(); // Should not update already-linked user
    expect(mockJwtSign).toHaveBeenCalled();
  });

  it('should redirect to login with error if code is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?error=missing_code');
    expect(mockGetTokensFromCode).not.toHaveBeenCalled();
  });

  it('should handle OAuth error from Google', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?error=access_denied'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?error=access_denied');
    expect(mockGetTokensFromCode).not.toHaveBeenCalled();
  });

  it('should reject unverified email', async () => {
    const mockTokens = {
      access_token: 'mock-access-token',
    };

    const mockGoogleUser = {
      id: 'google-user-id',
      email: 'unverified@example.com',
      name: 'Unverified User',
      picture: '',
      verified_email: false,
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?error=email_not_verified');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it('should handle missing access token', async () => {
    const mockTokens = {}; // No access_token

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?error=');
  });

  it('should use custom redirect from state', async () => {
    const mockTokens = { access_token: 'token' };
    const mockGoogleUser = {
      id: 'id',
      email: 'user@example.com',
      name: 'User',
      picture: '',
      verified_email: true,
    };
    const mockUser = {
      id: 'user-id',
      email: 'user@example.com',
      password: 'pass',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUserWithOrgs = {
      ...mockUser,
      organizations: [
        {
          id: 'user-org-1',
          userId: 'user-id',
          organizationId: 'org-id',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: { id: 'org-id', name: 'Org', slug: 'org', createdAt: new Date(), updatedAt: new Date() },
        },
      ],
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockUserFindUnique
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockUserWithOrgs);
    mockJwtSign.mockReturnValue('token' as any);

    const state = JSON.stringify({ redirectTo: '/templates' });
    const request = new NextRequest(
      `http://localhost:3000/api/auth/google/callback?code=code&state=${encodeURIComponent(state)}`
    );

    const response = await GET(request);

    expect(response.headers.get('location')).toContain('/templates');
  });

  it('should handle database error gracefully', async () => {
    const mockTokens = { access_token: 'token' };
    const mockGoogleUser = {
      id: 'id',
      email: 'user@example.com',
      name: 'User',
      picture: '',
      verified_email: true,
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockUserFindUnique.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?error=oauth_failed');
  });

  it('should handle invalid state parameter', async () => {
    const mockTokens = { access_token: 'token' };
    const mockGoogleUser = {
      id: 'id',
      email: 'user@example.com',
      name: 'User',
      picture: '',
      verified_email: true,
    };
    const mockUser = {
      id: 'user-id',
      email: 'user@example.com',
      password: 'pass',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockUserWithOrgs = {
      ...mockUser,
      organizations: [
        {
          id: 'user-org-1',
          userId: 'user-id',
          organizationId: 'org-id',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: { id: 'org-id', name: 'Org', slug: 'org', createdAt: new Date(), updatedAt: new Date() },
        },
      ],
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockUserFindUnique
      .mockResolvedValueOnce(mockUser)
      .mockResolvedValueOnce(mockUserWithOrgs);
    mockJwtSign.mockReturnValue('token' as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=code&state=invalid-json'
    );

    const response = await GET(request);

    // Should use default redirect
    expect(response.headers.get('location')).toContain('/dashboard');
  });
});
