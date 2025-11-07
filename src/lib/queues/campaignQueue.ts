import { Queue, QueueOptions } from 'bullmq';
import redis from '@/lib/redis';

// Job data interfaces
export interface ProcessCampaignJobData {
  campaignId: string;
  organizationId: string;
  batchNumber?: number;
  retryFailed?: boolean;
}

// Queue configuration
const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds, doubles each retry
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 86400, // Keep failed jobs for 24 hours
      count: 500, // Keep last 500 failed jobs
    },
  },
};

// Create campaign processing queue
export const campaignQueue = new Queue<ProcessCampaignJobData>(
  'campaign-processing',
  queueOptions
);

// Queue event listeners
campaignQueue.on('error', (error) => {
  console.error('❌ Campaign queue error:', error);
});

campaignQueue.on('waiting', (jobId) => {
  console.log(`⏳ Job ${jobId} is waiting to be processed`);
});

campaignQueue.on('active', (job) => {
  console.log(`🔄 Processing job ${job.id} for campaign ${job.data.campaignId}`);
});

campaignQueue.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed for campaign ${job.data.campaignId}`);
});

campaignQueue.on('failed', (job, error) => {
  console.error(
    `❌ Job ${job?.id} failed for campaign ${job?.data.campaignId}:`,
    error.message
  );
});

// Helper function to add a campaign processing job
export async function enqueueCampaignProcessing(
  data: ProcessCampaignJobData,
  options?: {
    delay?: number; // Delay in milliseconds
    priority?: number;
    jobId?: string;
  }
) {
  const job = await campaignQueue.add('process-campaign', data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: options?.jobId || `campaign-${data.campaignId}-${Date.now()}`,
  });

  console.log(
    `📬 Enqueued campaign processing job ${job.id} for campaign ${data.campaignId}`
  );

  return job;
}

// Helper function to add a delayed job for scheduled campaigns
export async function enqueueScheduledCampaign(
  data: ProcessCampaignJobData,
  scheduledAt: Date
) {
  const now = new Date();
  const delay = Math.max(0, scheduledAt.getTime() - now.getTime());

  const job = await campaignQueue.add('process-campaign', data, {
    delay,
    jobId: `scheduled-campaign-${data.campaignId}`,
  });

  console.log(
    `📅 Scheduled campaign ${data.campaignId} to process at ${scheduledAt.toISOString()} (delay: ${delay}ms)`
  );

  return job;
}

// Helper function to get job status
export async function getCampaignJobStatus(jobId: string) {
  const job = await campaignQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    state,
    progress,
    data: job.data,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

// Helper function to cancel a job
export async function cancelCampaignJob(jobId: string) {
  const job = await campaignQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  await job.remove();
  console.log(`🗑️ Cancelled job ${jobId}`);

  return true;
}

export default campaignQueue;
