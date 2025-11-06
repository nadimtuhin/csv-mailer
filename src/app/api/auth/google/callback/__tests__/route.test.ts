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
    $disconnect: jest.fn(),
  },
}));
jest.mock('jsonwebtoken');

const mockGetTokensFromCode = jest.mocked(googleOAuth.getTokensFromCode);
const mockGetUserInfo = jest.mocked(googleOAuth.getUserInfo);
const mockFindUnique = jest.mocked(prisma.user.findUnique);
const mockCreate = jest.mocked(prisma.user.create);
const mockUpdate = jest.mocked(prisma.user.update);
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockFindUnique.mockResolvedValue(null); // User doesn't exist
    mockCreate.mockResolvedValue(mockCreatedUser);
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
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'newuser@example.com' },
    });
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'newuser@example.com',
        password: expect.stringContaining('oauth_'),
      }),
    });
    expect(mockJwtSign).toHaveBeenCalledWith(
      {
        userId: 'user-id',
        email: 'newuser@example.com',
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

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockFindUnique.mockResolvedValue(mockExistingUser);
    mockUpdate.mockResolvedValue(mockUpdatedUser);
    mockJwtSign.mockReturnValue('mock-jwt-token' as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(mockFindUnique).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled(); // Should not create new user
    expect(mockUpdate).toHaveBeenCalledWith({
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

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockFindUnique.mockResolvedValue(mockLinkedUser);
    mockJwtSign.mockReturnValue('mock-jwt-token' as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=auth-code'
    );

    const response = await GET(request);

    expect(response.status).toBe(307);
    expect(mockFindUnique).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled(); // Should not update already-linked user
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
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
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

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockFindUnique.mockResolvedValue(mockUser);
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
    mockFindUnique.mockRejectedValue(new Error('Database error'));

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

    mockGetTokensFromCode.mockResolvedValue(mockTokens as any);
    mockGetUserInfo.mockResolvedValue(mockGoogleUser);
    mockFindUnique.mockResolvedValue(mockUser);
    mockJwtSign.mockReturnValue('token' as any);

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google/callback?code=code&state=invalid-json'
    );

    const response = await GET(request);

    // Should use default redirect
    expect(response.headers.get('location')).toContain('/dashboard');
  });
});
