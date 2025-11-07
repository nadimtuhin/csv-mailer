#!/usr/bin/env node

/**
 * Background Workers Entry Point
 *
 * This script starts all BullMQ workers for background job processing.
 * Run with: npm run workers
 *
 * Workers:
 * - Campaign Processor: Processes email campaigns in the background
 */

import './lib/workers/campaignProcessor';

console.log('🚀 Starting CSV-Mailer background workers...');
console.log('✅ Campaign processor worker started');
console.log('📊 Press Ctrl+C to stop workers\n');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM received, shutting down workers gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT received, shutting down workers gracefully...');
  process.exit(0);
});
