import { Queue, QueueEvents, Worker } from 'bullmq';
import Redis from 'ioredis';

/**
 * Redis connection configuration
 */
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis URL for connection options
function getRedisConfig() {
  try {
    const url = new URL(redisUrl);
    return {
      host: url.hostname,
      port: parseInt(url.port) || 6379,
      password: url.password || undefined,
      maxRetriesPerRequest: null, // Required for BullMQ
    };
  } catch {
    // Fallback for simple host:port format
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

const redisConfig = getRedisConfig();

/**
 * Create a Redis connection for BullMQ
 */
export function createRedisConnection() {
  return new Redis(redisConfig);
}

/**
 * Job data types
 */
export interface EmailJobData {
  campaignId: string;
  recipientId: string;
  recipientEmail: string;
  recipientData: Record<string, unknown>;
  templateHtml: string;
  subject: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail: string;
  pdfTemplatePath?: string;
  organizationId: string;
  attempt?: number;
}

export interface CampaignProcessJobData {
  campaignId: string;
  organizationId: string;
}

/**
 * Queue names
 */
export const QUEUE_NAMES = {
  EMAIL_CAMPAIGN: 'email-campaign',
  CAMPAIGN_SCHEDULER: 'campaign-scheduler',
} as const;

/**
 * Email campaign queue
 * Handles individual email sending jobs
 */
export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL_CAMPAIGN, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: 'exponential',
      delay: 60000, // Start with 1 minute delay
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

/**
 * Campaign scheduler queue
 * Checks for scheduled campaigns that need to be processed
 */
export const schedulerQueue = new Queue<CampaignProcessJobData>(
  QUEUE_NAMES.CAMPAIGN_SCHEDULER,
  {
    connection: createRedisConnection(),
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
    },
  }
);

/**
 * Queue events for monitoring
 */
export const emailQueueEvents = new QueueEvents(QUEUE_NAMES.EMAIL_CAMPAIGN, {
  connection: createRedisConnection(),
});

export const schedulerQueueEvents = new QueueEvents(QUEUE_NAMES.CAMPAIGN_SCHEDULER, {
  connection: createRedisConnection(),
});

/**
 * Helper function to add an email job to the queue
 */
export async function addEmailJob(data: EmailJobData, priority?: number) {
  return await emailQueue.add('send-email', data, {
    priority: priority || 0,
  });
}

/**
 * Helper function to add multiple email jobs in bulk
 */
export async function addBulkEmailJobs(
  jobs: Array<{ data: EmailJobData; priority?: number }>
) {
  return await emailQueue.addBulk(
    jobs.map((job) => ({
      name: 'send-email',
      data: job.data,
      opts: {
        priority: job.priority || 0,
      },
    }))
  );
}

/**
 * Helper function to trigger campaign processing
 */
export async function addCampaignProcessJob(data: CampaignProcessJobData) {
  return await schedulerQueue.add('process-campaign', data);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(queueName: string) {
  const queue = queueName === QUEUE_NAMES.EMAIL_CAMPAIGN ? emailQueue : schedulerQueue;

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Clean up old jobs from the queue
 */
export async function cleanQueue(queueName: string, grace: number = 24 * 3600 * 1000) {
  const queue = queueName === QUEUE_NAMES.EMAIL_CAMPAIGN ? emailQueue : schedulerQueue;

  await queue.clean(grace, 100, 'completed');
  await queue.clean(grace * 7, 100, 'failed'); // Keep failed jobs longer
}

/**
 * Gracefully close queue connections
 */
export async function closeQueues() {
  await Promise.all([
    emailQueue.close(),
    schedulerQueue.close(),
    emailQueueEvents.close(),
    schedulerQueueEvents.close(),
  ]);
}
