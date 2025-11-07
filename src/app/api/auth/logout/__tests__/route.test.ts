import { NextRequest } from 'next/server';
import { POST } from '../route';

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should logout successfully and clear cookie', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/logout', {
      method: 'POST',
    });

    const response = await POST();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe('Logged out successfully');

    // Check if cookie is cleared (maxAge = -1)
    const cookies = response.cookies.getAll();
    const authCookie = cookies.find((c) => c.name === 'authToken');
    expect(authCookie).toBeDefined();
    expect(authCookie?.value).toBe('');
  });

  it('should handle errors gracefully', async () => {
    // Since there's minimal logic in logout, we can test that it doesn't throw
    const response = await POST();
    expect(response.status).toBe(200);
  });
});
