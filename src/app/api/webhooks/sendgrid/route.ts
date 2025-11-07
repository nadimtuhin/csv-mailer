/**
 * SendGrid Webhook Handler
 *
 * Handles email event webhooks from SendGrid including:
 * - delivered: Email was successfully delivered
 * - open: Email was opened
 * - click: Link in email was clicked
 * - bounce: Email bounced
 * - dropped: SendGrid dropped the email
 * - deferred: SendGrid deferred sending
 * - spam_report: Email was marked as spam
 * - unsubscribe: Recipient unsubscribed
 *
 * Webhook Signature Verification:
 * https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { getEnv } from '@/lib/env';

/**
 * SendGrid webhook event type
 */
interface SendGridEvent {
  email: string;
  timestamp: number;
  event: string;
  'sg_message_id': string;
  'smtp-id'?: string;
  url?: string;
  useragent?: string;
  ip?: string;
  reason?: string;
  status?: string;
  response?: string;
  [key: string]: unknown;
}

/**
 * Verify SendGrid webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  timestamp: string | null
): boolean {
  const env = getEnv();
  const webhookSecret = env.SENDGRID_WEBHOOK_SECRET;

  // If no secret is configured, skip verification (not recommended for production)
  if (!webhookSecret) {
    console.warn('[SendGrid Webhook] No SENDGRID_WEBHOOK_SECRET configured, skipping signature verification');
    return true;
  }

  // Signature and timestamp are required if secret is configured
  if (!signature || !timestamp) {
    console.error('[SendGrid Webhook] Missing signature or timestamp headers');
    return false;
  }

  try {
    // SendGrid signature algorithm: HMAC-SHA256 of timestamp + payload
    const signedPayload = timestamp + payload;
    const computedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('base64');

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );

    if (!isValid) {
      console.error('[SendGrid Webhook] Signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('[SendGrid Webhook] Error verifying signature:', error);
    return false;
  }
}

/**
 * Process SendGrid webhook event
 */
async function processEvent(event: SendGridEvent): Promise<void> {
  const messageId = event.sg_message_id || event['smtp-id'];
  const eventType = event.event;
  const timestamp = new Date(event.timestamp * 1000);

  if (!messageId) {
    console.warn('[SendGrid Webhook] Event missing message ID, skipping');
    return;
  }

  console.log(`[SendGrid Webhook] Processing ${eventType} event for message: ${messageId}`);

  // Find recipient by message ID
  const recipient = await prisma.campaignRecipient.findFirst({
    where: { messageId: messageId },
  });

  if (!recipient) {
    console.warn(`[SendGrid Webhook] No recipient found for message ID: ${messageId}`);
    return;
  }

  // Store the event
  await prisma.emailEvent.create({
    data: {
      recipientId: recipient.id,
      eventType,
      timestamp,
      messageId,
      url: event.url || null,
      userAgent: event.useragent || null,
      ip: event.ip || null,
      reason: event.reason || event.status || event.response || null,
      rawData: JSON.stringify(event),
    },
  });

  // Update recipient tracking fields
  const updates: Record<string, unknown> = {};

  switch (eventType) {
    case 'delivered':
      if (!recipient.deliveredAt) {
        updates.deliveredAt = timestamp;
      }
      break;

    case 'open':
      updates.openCount = { increment: 1 };
      if (!recipient.openedAt) {
        updates.openedAt = timestamp;
      }
      break;

    case 'click':
      updates.clickCount = { increment: 1 };
      if (!recipient.clickedAt) {
        updates.clickedAt = timestamp;
      }
      break;

    case 'bounce':
    case 'dropped':
      if (!recipient.bouncedAt) {
        updates.bouncedAt = timestamp;
        updates.bounceReason = event.reason || event.status || 'Unknown';
        updates.status = 'failed';
      }
      break;

    case 'deferred':
      // Deferred is temporary, don't update status
      console.log(`[SendGrid Webhook] Email deferred for ${recipient.recipientEmail}: ${event.reason || 'Unknown reason'}`);
      break;

    case 'spam_report':
      console.log(`[SendGrid Webhook] Spam report from ${recipient.recipientEmail}`);
      // Optionally add to unsubscribe list
      break;

    case 'unsubscribe':
      console.log(`[SendGrid Webhook] Unsubscribe event from ${recipient.recipientEmail}`);
      // Handled separately by unsubscribe endpoint
      break;

    default:
      console.log(`[SendGrid Webhook] Unhandled event type: ${eventType}`);
  }

  // Apply updates if any
  if (Object.keys(updates).length > 0) {
    await prisma.campaignRecipient.update({
      where: { id: recipient.id },
      data: updates,
    });

    console.log(`[SendGrid Webhook] Updated recipient ${recipient.recipientEmail} for event: ${eventType}`);
  }
}

/**
 * POST /api/webhooks/sendgrid
 * Handle SendGrid webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Get signature headers
    const signature = request.headers.get('x-twilio-email-event-webhook-signature');
    const timestamp = request.headers.get('x-twilio-email-event-webhook-timestamp');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature, timestamp)) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // Parse events
    const events: SendGridEvent[] = JSON.parse(body);

    // Process each event
    const promises = events.map((event) => processEvent(event));
    await Promise.allSettled(promises);

    console.log(`[SendGrid Webhook] Processed ${events.length} events successfully`);

    return NextResponse.json({ success: true, processed: events.length });
  } catch (error) {
    console.error('[SendGrid Webhook] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/webhooks/sendgrid
 * Health check endpoint
 */
export async function GET() {
  const env = getEnv();
  const hasSecret = !!env.SENDGRID_WEBHOOK_SECRET;

  return NextResponse.json({
    status: 'ok',
    message: 'SendGrid webhook endpoint is active',
    signatureVerification: hasSecret ? 'enabled' : 'disabled (configure SENDGRID_WEBHOOK_SECRET)',
  });
}
