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
    $disconnect: jest.fn(),
  },
}));

jest.mock('bcrypt');

const mockFindUnique = jest.mocked(prisma.user.findUnique);
const mockCreate = jest.mocked(prisma.user.create);
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
    };

    mockFindUnique.mockResolvedValue(null); // User doesn't exist
    mockBcryptHash.mockResolvedValue('hashedpassword123' as never);
    mockCreate.mockResolvedValue(mockUser);

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
    expect(data.email).toBe('newuser@example.com');
    expect(data.password).toBeUndefined(); // Password should not be returned
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { email: 'newuser@example.com' },
    });
    expect(mockBcryptHash).toHaveBeenCalledWith('password123', 10);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        email: 'newuser@example.com',
        password: 'hashedpassword123',
      },
    });
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
    expect(mockFindUnique).not.toHaveBeenCalled();
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
    expect(mockFindUnique).not.toHaveBeenCalled();
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

    mockFindUnique.mockResolvedValue(existingUser);

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
    mockFindUnique.mockRejectedValue(new Error('Database connection error'));

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
