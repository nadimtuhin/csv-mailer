import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '@/lib/prisma';

// Set JWT_SECRET before importing the route
const originalEnv = process.env.JWT_SECRET;
process.env.JWT_SECRET = 'test-secret-key';

// Import after setting env var
let POST: any;

// Mock modules
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

jest.mock('bcrypt');
jest.mock('jsonwebtoken');

const mockFindUnique = jest.mocked(prisma.user.findUnique);
const mockBcryptCompare = jest.mocked(bcrypt.compare);
const mockJwtSign = jest.mocked(jwt.sign);

describe('POST /api/auth/login', () => {
  beforeAll(async () => {
    // Dynamically import the route after mocks are set up
    const module = await import('../route');
    POST = module.POST;
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv !== undefined) {
      process.env.JWT_SECRET = originalEnv;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully with valid credentials', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashedpassword123',
      googleId: null,
      name: null,
      picture: null,
      authProvider: 'password',
      createdAt: new Date(),
      updatedAt: new Date(),
      organizations: [
        {
          id: 'user-org-1',
          userId: 'user-id',
          organizationId: 'org-1',
          role: 'owner',
          createdAt: new Date(),
          updatedAt: new Date(),
          organization: {
            id: 'org-1',
            name: "Test User's Organization",
            slug: 'test',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    };

    mockFindUnique.mockResolvedValue(mockUser);
    mockBcryptCompare.mockResolvedValue(true as never);
    mockJwtSign.mockReturnValue('mock-jwt-token' as never);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.email).toBe('test@example.com');
    expect(data.password).toBeUndefined(); // Password should not be returned
    expect(data.organizations).toBeDefined();
    expect(data.organizations).toHaveLength(1);
    expect(data.currentOrganizationId).toBe('org-1');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
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
    expect(mockBcryptCompare).toHaveBeenCalledWith(
      'password123',
      'hashedpassword123'
    );
    expect(mockJwtSign).toHaveBeenCalledWith(
      {
        userId: 'user-id',
        email: 'test@example.com',
        organizationId: 'org-1',
      },
      'test-secret-key',
      { expiresIn: '1d' }
    );

    // Check if cookie is set
    const cookies = response.cookies.getAll();
    const authCookie = cookies.find((c) => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBe('mock-jwt-token');
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 400 if password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it('should return 401 if user does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
    expect(mockBcryptCompare).not.toHaveBeenCalled();
  });

  it('should return 401 if password is incorrect', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      password: 'hashedpassword123',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFindUnique.mockResolvedValue(mockUser);
    mockBcryptCompare.mockResolvedValue(false as never);

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Invalid credentials');
    expect(mockJwtSign).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    // Next.js request parsing may throw, resulting in 500
    expect([400, 500]).toContain(response.status);
    expect(data.error).toBeDefined();
  });

  it('should return 500 if there is a database error', async () => {
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('An internal server error occurred');
  });
});
