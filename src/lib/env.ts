import { z } from 'zod';

/**
 * Environment variable schema
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Authentication
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters for security')
    .refine(
      (val) => val !== 'YOUR_VERY_SECRET_RANDOM_STRING_REPLACE_ME',
      'JWT_SECRET must be changed from default value'
    ),

  // Email Service
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
  EMAIL_PROVIDER: z
    .enum(['sendgrid', 'ses', 'fake'])
    .optional()
    .default('sendgrid'),

  // AWS SES (optional - for AWS SES email provider)
  AWS_REGION: z.string().optional(),
  AWS_SES_REGION: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),

  // Redis (optional - for background jobs)
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),

  // Upstash Redis (optional - for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Google OAuth (optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional but recommended
  PORT: z.string().optional().default('3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables at application startup
 * @throws Error if validation fails
 */
export function validateEnv(): Env {
  try {
    const env = envSchema.parse(process.env);
    console.log('✅ Environment variables validated successfully');
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
        .join('\n');

      console.error('❌ Environment variable validation failed:\n' + issues);
      throw new Error(
        'Invalid environment configuration. Please check your .env file.'
      );
    }
    throw error;
  }
}

/**
 * Get type-safe environment variables
 * Note: Call validateEnv() first during app initialization
 */
export function getEnv(): Env {
  return process.env as unknown as Env;
}

/**
 * Check if app is in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if app is in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if app is in test mode
 */
export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}
