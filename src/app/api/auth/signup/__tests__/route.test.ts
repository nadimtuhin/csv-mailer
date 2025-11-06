import { NextRequest } from 'next/server';
import { POST } from '../route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcrypt';

// Mock modules
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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

jest.mock('bcrypt');

const mockUserFindUnique = jest.mocked(prisma.user.findUnique);
const mockUserCreate = jest.mocked(prisma.user.create);
const mockOrgFindUnique = jest.mocked(prisma.organization.findUnique);
const mockOrgCreate = jest.mocked(prisma.organization.create);
const mockUserOrgCreate = jest.mocked(prisma.userOrganization.create);
const mockTransaction = jest.mocked(prisma.$transaction);
const mockBcryptHash = jest.mocked(bcrypt.hash);

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a new user successfully', async () => {
    const mockUser = {
      id: 'user-id',
      email: 'newuser@example.com',
      password: 'hashedpassword123',
      createdAt: new Date(),
      updatedAt: new Date(),
      googleId: null,
      name: null,
      picture: null,
      authProvider: 'password',
    };

    const mockOrganization = {
      id: 'org-id',
      name: "newuser's Organization",
      slug: 'newuser',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserFindUnique.mockResolvedValue(null); // User doesn't exist
    mockOrgFindUnique.mockResolvedValue(null); // Slug is available
    mockBcryptHash.mockResolvedValue('hashedpassword123' as never);

    // Mock the transaction to execute the callback and return the result
    mockTransaction.mockImplementation(async (callback: any) => {
      // Create a mock transaction client with the same methods
      const txClient = {
        user: { create: mockUserCreate },
        organization: { create: mockOrgCreate },
        userOrganization: { create: mockUserOrgCreate },
      };
      return callback(txClient);
    });

    mockUserCreate.mockResolvedValue(mockUser);
    mockOrgCreate.mockResolvedValue(mockOrganization);
    mockUserOrgCreate.mockResolvedValue({} as any);

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'newuser@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.user.email).toBe('newuser@example.com');
    expect(data.user.password).toBeUndefined(); // Password should not be returned
    expect(data.organization.name).toBe("newuser's Organization");
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { email: 'newuser@example.com' },
    });
    expect(mockBcryptHash).toHaveBeenCalledWith('password123', 10);
  });

  it('should return 400 if email is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('should return 400 if password is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Email and password are required');
  });

  it('should return 400 for invalid email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid email format');
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it('should return 400 if password is too short', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'short',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Password must be at least 8 characters long');
  });

  it('should return 409 if user already exists', async () => {
    const existingUser = {
      id: 'existing-user-id',
      email: 'existing@example.com',
      password: 'hashedpassword',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUserFindUnique.mockResolvedValue(existingUser);

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'password123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('User with this email already exists');
    expect(mockBcryptHash).not.toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('should handle invalid JSON body', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
    mockUserFindUnique.mockRejectedValue(new Error('Database connection error'));

    const request = new NextRequest('http://localhost:3000/api/auth/signup', {
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
