import { NextRequest } from 'next/server';
import { GET } from '../route';
import * as googleOAuth from '@/lib/googleOAuth';

// Mock the googleOAuth module
jest.mock('@/lib/googleOAuth');

const mockValidateOAuthConfig = jest.mocked(googleOAuth.validateOAuthConfig);
const mockGetAuthorizationUrl = jest.mocked(googleOAuth.getAuthorizationUrl);

describe('GET /api/auth/google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should redirect to Google OAuth URL on success', async () => {
    mockValidateOAuthConfig.mockReturnValue({ isValid: true });
    mockGetAuthorizationUrl.mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=test'
    );

    const request = new NextRequest('http://localhost:3000/api/auth/google');

    const response = await GET(request);

    expect(response.status).toBe(307); // Redirect status
    expect(response.headers.get('location')).toContain('accounts.google.com');
    expect(mockValidateOAuthConfig).toHaveBeenCalled();
    expect(mockGetAuthorizationUrl).toHaveBeenCalled();
  });

  it('should include redirectTo in state parameter', async () => {
    mockValidateOAuthConfig.mockReturnValue({ isValid: true });
    mockGetAuthorizationUrl.mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );

    const request = new NextRequest(
      'http://localhost:3000/api/auth/google?redirectTo=/campaigns'
    );

    await GET(request);

    // Verify state parameter includes redirectTo
    const callArgs = mockGetAuthorizationUrl.mock.calls[0];
    const state = callArgs[0];
    expect(state).toBeDefined();

    const parsedState = JSON.parse(state!);
    expect(parsedState.redirectTo).toBe('/campaigns');
  });

  it('should use default redirect if not provided', async () => {
    mockValidateOAuthConfig.mockReturnValue({ isValid: true });
    mockGetAuthorizationUrl.mockReturnValue('https://accounts.google.com');

    const request = new NextRequest('http://localhost:3000/api/auth/google');

    await GET(request);

    const callArgs = mockGetAuthorizationUrl.mock.calls[0];
    const state = callArgs[0];
    const parsedState = JSON.parse(state!);
    expect(parsedState.redirectTo).toBe('/dashboard');
  });

  it('should return 500 if OAuth config is invalid', async () => {
    mockValidateOAuthConfig.mockReturnValue({
      isValid: false,
      error: 'GOOGLE_CLIENT_ID is not configured',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/google');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('OAuth configuration error');
    expect(data.error).toContain('GOOGLE_CLIENT_ID');
    expect(mockGetAuthorizationUrl).not.toHaveBeenCalled();
  });

  it('should return 500 if authorization URL generation fails', async () => {
    mockValidateOAuthConfig.mockReturnValue({ isValid: true });
    mockGetAuthorizationUrl.mockImplementation(() => {
      throw new Error('Failed to generate URL');
    });

    const request = new NextRequest('http://localhost:3000/api/auth/google');

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to initiate Google authentication');
  });
});
