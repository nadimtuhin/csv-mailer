/**
 * Rate Limiting Utilities
 *
 * Provides API rate limiting using Upstash Redis.
 * Rate limiting is optional - if Upstash credentials are not configured,
 * requests will pass through without rate limiting.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';
import { getEnv } from './env';

/**
 * Create Upstash Redis client if credentials are available
 */
function createRedisClient(): Redis | null {
  const env = getEnv();

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  return new Redis({
    url: env.UPSTASH_REDIS_REST_URL,
    token: env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const redis = createRedisClient();

/**
 * Rate limiter for authentication endpoints (login, signup)
 * Stricter limits to prevent brute force attacks
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      analytics: true,
      prefix: '@upstash/ratelimit/auth',
    })
  : null;

/**
 * Rate limiter for general API endpoints
 * 100 requests per minute per IP
 */
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      analytics: true,
      prefix: '@upstash/ratelimit/api',
    })
  : null;

/**
 * Rate limiter for email sending endpoints
 * 10 requests per minute per organization to prevent abuse
 */
export const emailRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: '@upstash/ratelimit/email',
    })
  : null;

/**
 * Rate limiter for file upload endpoints
 * 20 uploads per hour per IP
 */
export const uploadRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'),
      analytics: true,
      prefix: '@upstash/ratelimit/upload',
    })
  : null;

/**
 * Get identifier for rate limiting (IP address or fallback)
 */
export function getRateLimitIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] ?? realIp ?? 'anonymous';

  return ip;
}

/**
 * Get organization-specific identifier for rate limiting
 */
export function getOrgRateLimitIdentifier(request: NextRequest): string {
  const organizationId = request.headers.get('x-organization-id');
  return organizationId || getRateLimitIdentifier(request);
}

/**
 * Apply rate limiting to a request
 * Returns null if rate limit is not exceeded, otherwise returns error response
 */
export async function checkRateLimit(
  ratelimiter: Ratelimit | null,
  identifier: string
): Promise<NextResponse | null> {
  // If rate limiter is not configured, allow the request
  if (!ratelimiter) {
    return null;
  }

  try {
    const { success, limit, reset, remaining } = await ratelimiter.limit(identifier);

    if (!success) {
      const resetDate = new Date(reset);
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          limit,
          remaining: 0,
          reset: resetDate.toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': retryAfter.toString(),
          },
        }
      );
    }

    // Request is allowed - return null to continue processing
    return null;
  } catch (error) {
    // If rate limiting fails, log error but allow request to proceed
    console.error('Rate limiting error:', error);
    return null;
  }
}

/**
 * Middleware function for auth endpoints
 */
export async function applyAuthRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const identifier = getRateLimitIdentifier(request);
  return checkRateLimit(authRateLimiter, identifier);
}

/**
 * Middleware function for API endpoints
 */
export async function applyApiRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const identifier = getRateLimitIdentifier(request);
  return checkRateLimit(apiRateLimiter, identifier);
}

/**
 * Middleware function for email endpoints
 */
export async function applyEmailRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const identifier = getOrgRateLimitIdentifier(request);
  return checkRateLimit(emailRateLimiter, identifier);
}

/**
 * Middleware function for upload endpoints
 */
export async function applyUploadRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const identifier = getRateLimitIdentifier(request);
  return checkRateLimit(uploadRateLimiter, identifier);
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return redis !== null;
}
