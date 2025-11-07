import { Redis } from 'ioredis';

// Redis connection configuration
const getRedisUrl = (): string => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    // Default to local Redis for development
    return 'redis://localhost:6379';
  }

  return redisUrl;
};

// Create Redis connection instance
const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: true,
  enableOfflineQueue: true,
});

// Handle connection events
redis.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redis.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redis.on('ready', () => {
  console.log('✅ Redis ready to accept commands');
});

redis.on('close', () => {
  console.warn('⚠️ Redis connection closed');
});

export default redis;
