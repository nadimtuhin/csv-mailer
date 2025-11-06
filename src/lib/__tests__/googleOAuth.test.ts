import {
  createOAuth2Client,
  getAuthorizationUrl,
  validateOAuthConfig,
  GOOGLE_OAUTH_CONFIG,
} from '../googleOAuth';
import { google } from 'googleapis';

// Mock googleapis
jest.mock('googleapis');

describe('googleOAuth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  describe('validateOAuthConfig', () => {
    it('should validate correct configuration', () => {
      // Set env vars before requiring module
      process.env = {
        ...originalEnv,
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
      };

      jest.resetModules();
      const { validateOAuthConfig: validate } = require('../googleOAuth');

      const result = validate();
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail if GOOGLE_CLIENT_ID is missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;

      // Re-import to get new config
      jest.resetModules();
      const { validateOAuthConfig: validate } = require('../googleOAuth');

      const result = validate();
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('GOOGLE_CLIENT_ID is not configured');
    });

    it('should fail if GOOGLE_CLIENT_SECRET is missing', () => {
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      delete process.env.GOOGLE_CLIENT_SECRET;

      jest.resetModules();
      const { validateOAuthConfig: validate } = require('../googleOAuth');

      const result = validate();
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('GOOGLE_CLIENT_SECRET is not configured');
    });

    it('should use default redirect URI if env var is missing', () => {
      delete process.env.GOOGLE_REDIRECT_URI;
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';

      jest.resetModules();
      const { validateOAuthConfig: validate, GOOGLE_OAUTH_CONFIG } = require('../googleOAuth');

      const result = validate();
      expect(result.isValid).toBe(true);
      expect(GOOGLE_OAUTH_CONFIG.redirectUri).toBe('http://localhost:3000/api/auth/google/callback');
    });
  });

  describe('createOAuth2Client', () => {
    it('should create OAuth2 client with correct config', () => {
      const mockOAuth2 = jest.fn();

      // Set up the mock before resetting modules
      jest.doMock('googleapis', () => ({
        google: {
          auth: {
            OAuth2: mockOAuth2,
          },
          oauth2: jest.fn(),
        },
      }));

      process.env = {
        ...originalEnv,
        GOOGLE_CLIENT_ID: 'test-client-id',
        GOOGLE_CLIENT_SECRET: 'test-client-secret',
        GOOGLE_REDIRECT_URI: 'http://localhost:3000/api/auth/google/callback',
      };

      jest.resetModules();
      const { createOAuth2Client: createClient } = require('../googleOAuth');

      createClient();

      expect(mockOAuth2).toHaveBeenCalledWith(
        'test-client-id',
        'test-client-secret',
        'http://localhost:3000/api/auth/google/callback'
      );
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with state', () => {
      const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/auth');
      const mockOAuth2Client = {
        generateAuthUrl: mockGenerateAuthUrl,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      const state = 'test-state';
      const url = getAuthorizationUrl(state);

      expect(url).toBe('https://accounts.google.com/auth');
      expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile',
        ],
        state: 'test-state',
        prompt: 'consent',
      });
    });

    it('should generate random state if not provided', () => {
      const mockGenerateAuthUrl = jest.fn().mockReturnValue('https://accounts.google.com/auth');
      const mockOAuth2Client = {
        generateAuthUrl: mockGenerateAuthUrl,
      };

      (google.auth.OAuth2 as jest.Mock) = jest.fn(() => mockOAuth2Client);

      // Mock crypto.randomUUID
      const originalCrypto = global.crypto;
      global.crypto = {
        ...originalCrypto,
        randomUUID: jest.fn().mockReturnValue('random-uuid'),
      } as any;

      getAuthorizationUrl();

      expect(mockGenerateAuthUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'random-uuid',
        })
      );

      global.crypto = originalCrypto;
    });
  });

  describe('GOOGLE_OAUTH_CONFIG', () => {
    it('should use environment variables', () => {
      // The config is loaded at module import time, so we need to test it directly
      expect(GOOGLE_OAUTH_CONFIG.clientId).toBeDefined();
      expect(GOOGLE_OAUTH_CONFIG.clientSecret).toBeDefined();
      expect(GOOGLE_OAUTH_CONFIG.redirectUri).toBeDefined();
    });

    it('should have default values if env vars are missing', () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REDIRECT_URI;

      jest.resetModules();
      const { GOOGLE_OAUTH_CONFIG: config } = require('../googleOAuth');

      expect(config.clientId).toBe('');
      expect(config.clientSecret).toBe('');
      expect(config.redirectUri).toBe('http://localhost:3000/api/auth/google/callback');
    });
  });
});
