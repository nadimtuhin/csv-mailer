# Next Steps for CSV Mailer Project

**Generated**: 2025-11-06
**Current Status**: Multi-tenancy complete, 68/129 tests failing

---

## 📊 Current Project Status

### ✅ **Recently Completed (Last Session)**

1. **Multi-Tenancy** - COMPLETE
   - Database schema with Organizations
   - Automatic org creation on signup/OAuth
   - JWT includes organizationId
   - Middleware enforces tenant isolation
   - All API routes filter by organizationId
   - Cross-tenant access returns 403

2. **Google OAuth** - COMPLETE
   - Full OAuth 2.0 flow with Google
   - Automatic user & org creation
   - Email verification requirement
   - CSRF protection with state parameter
   - 24 comprehensive tests

3. **Authentication & Authorization** - COMPLETE
   - JWT-based auth with HTTP-only cookies
   - Middleware protects all API routes
   - Environment variable validation with Zod
   - Password hashing with bcrypt

### ⚠️ **Current Issues**

1. **68 out of 129 tests failing** - CRITICAL
   - Tests don't include organizationId in headers
   - Tests use old database schema (no org fields)
   - Mock data doesn't include organizations
   - OAuth callback tests expect different redirects

2. **No background job system** - CRITICAL
   - Campaigns don't send emails automatically
   - Scheduled campaigns won't run
   - No retry mechanism for failed emails

3. **Legal compliance issue** - HIGH
   - No unsubscribe functionality (CAN-SPAM Act violation)

---

## 🎯 Recommended Next Steps (Prioritized)

### **IMMEDIATE PRIORITY (This Week)**

#### 1. Fix All Tests (URGENT)
**Why**: Broken tests = no confidence in code changes
**Estimated Time**: 4-6 hours
**Impact**: High - enables safe development

**What needs fixing**:
- Update all test mocks to include organizationId
- Mock x-organization-id header in API tests
- Update database setup to create test organizations
- Fix OAuth callback tests (expect organization fetch)
- Update signup/login tests for org creation

**Affected files**:
- `src/app/api/templates/__tests__/route.test.ts`
- `src/app/api/campaigns/__tests__/route.test.ts`
- `src/app/api/auth/login/__tests__/route.test.ts`
- `src/app/api/auth/signup/__tests__/route.test.ts`
- `src/app/api/auth/google/callback/__tests__/route.test.ts`
- `src/app/api/templates/[templateId]/__tests__/route.test.ts`

**Test pattern example**:
```typescript
// Before request, mock the header
const mockHeaders = new Headers();
mockHeaders.set('x-organization-id', 'test-org-id');

// Or create organization in test setup
beforeAll(async () => {
  testOrg = await prisma.organization.create({
    data: { name: 'Test Org', slug: 'test-org' }
  });
});
```

---

#### 2. Background Job System (CRITICAL)
**Why**: Emails don't send without this!
**Estimated Time**: 6-8 hours
**Impact**: CRITICAL - core functionality

**Options**:
- **BullMQ** (Recommended) - Robust, Redis-based, good monitoring
- **Node-cron** (Simple) - No dependencies, good for basic scheduling
- **Quirrel** (Modern) - Serverless-friendly
- **Inngest** (Managed) - No infrastructure needed

**Recommended: BullMQ + Redis**

**What to implement**:
1. Email processing queue
   ```typescript
   // Queue: email-campaign
   // Job: { campaignId, recipientId, attempt }
   ```

2. Campaign processor worker
   - Fetch pending recipients
   - Render template with recipient data
   - Send via SendGrid
   - Update status (sent/failed)
   - Handle errors and retry

3. Scheduled campaign checker (cron: every minute)
   - Find campaigns with `scheduledAt <= now` and `status = 'scheduled'`
   - Change status to 'queued'
   - Trigger email processing

4. Failed email retry with exponential backoff
   - 1 min, 5 min, 30 min, 2 hr, 6 hr
   - Max 5 attempts
   - Move to dead letter queue after max attempts

**Files to create**:
- `src/lib/queue.ts` - Queue setup
- `src/workers/email-processor.ts` - Email sending worker
- `src/workers/campaign-scheduler.ts` - Scheduled campaign checker
- `src/app/api/campaigns/process/route.ts` - Manual trigger endpoint

**Environment variables needed**:
```env
REDIS_URL=redis://localhost:6379
```

---

#### 3. Unsubscribe Feature (LEGAL REQUIREMENT)
**Why**: CAN-SPAM Act compliance - can be fined!
**Estimated Time**: 3-4 hours
**Impact**: HIGH - legal liability

**What to implement**:
1. Unsubscribe list database model
   ```prisma
   model Unsubscribe {
     id        String   @id @default(cuid())
     email     String
     orgId     String
     createdAt DateTime @default(now())
     @@unique([email, orgId])
     @@index([orgId, email])
   }
   ```

2. Unsubscribe link in email templates
   - Generate signed token with email + campaignId
   - Add to email footer: `<a href="/unsubscribe?token=...">Unsubscribe</a>`

3. Unsubscribe page
   - `/unsubscribe?token=...`
   - Verify token, show confirmation
   - Add email to unsubscribe list

4. Filter recipients before sending
   - Check unsubscribe list before queueing
   - Skip unsubscribed emails
   - Increment skippedCount

5. Add List-Unsubscribe header (RFC 8058)
   ```typescript
   headers: {
     'List-Unsubscribe': '<https://app.com/unsubscribe?token=...>',
     'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
   }
   ```

**Files to create**:
- `prisma/schema.prisma` - Add Unsubscribe model
- `src/app/unsubscribe/page.tsx` - Unsubscribe page
- `src/lib/unsubscribe.ts` - Token generation/verification
- `src/app/api/unsubscribe/route.ts` - Unsubscribe API

---

### **HIGH PRIORITY (Next Week)**

#### 4. Rate Limiting
**Why**: Prevent API abuse and DDoS
**Estimated Time**: 2-3 hours
**Impact**: MEDIUM - security & stability

**Recommended**: `@upstash/ratelimit` with Redis

**What to implement**:
- Per-IP rate limiting (100 req/min)
- Per-user rate limiting (1000 req/hour)
- Campaign creation throttling (10/hour)
- Template creation throttling (50/hour)

**Implementation**:
```typescript
// src/lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'),
});

// In middleware
const ip = request.ip ?? '127.0.0.1';
const { success } = await ratelimit.limit(ip);
if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
```

---

#### 5. Error Monitoring & Logging
**Why**: Debug production issues, track errors
**Estimated Time**: 3-4 hours
**Impact**: MEDIUM - operational visibility

**Recommended**: Sentry for errors + Pino for logs

**What to implement**:
1. Sentry integration
   - Error tracking
   - Performance monitoring
   - User context (userId, organizationId)

2. Structured logging with Pino
   - Replace console.log/error
   - Log levels (debug, info, warn, error)
   - Request/response logging
   - Audit logs for sensitive actions

3. Log important events:
   - User signup/login
   - Campaign creation/send
   - Template modifications
   - Failed email sends
   - API errors

**Files to create**:
- `src/lib/logger.ts` - Pino setup
- `src/lib/sentry.ts` - Sentry initialization
- `sentry.client.config.ts` - Client-side Sentry
- `sentry.server.config.ts` - Server-side Sentry

**Environment variables**:
```env
SENTRY_DSN=https://...@sentry.io/...
```

---

#### 6. Input Sanitization & XSS Prevention
**Why**: Prevent XSS attacks via email templates
**Estimated Time**: 2-3 hours
**Impact**: HIGH - security

**What to implement**:
1. HTML sanitization for templates (DOMPurify)
2. Template variable escaping
3. Email subject/from name sanitization
4. CSV file content validation

**Recommended**: `isomorphic-dompurify`

**Implementation**:
```typescript
// src/lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'img', 'table', 'tr', 'td'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style'],
  });
}
```

Apply in template POST/PUT endpoints before saving.

---

### **MEDIUM PRIORITY (Month 1)**

#### 7. Email Delivery Tracking
**Why**: Know if emails are delivered, opened, clicked
**Estimated Time**: 4-5 hours
**Impact**: MEDIUM - analytics & insights

**What to implement**:
1. SendGrid webhook endpoint
   - `/api/webhooks/sendgrid`
   - Handle: delivered, bounced, opened, clicked

2. Update CampaignRecipient status
   - Track delivery status
   - Track open/click events
   - Store bounce reasons

3. Campaign analytics dashboard
   - Delivery rate
   - Open rate
   - Click rate
   - Bounce rate

**Database changes**:
```prisma
model CampaignRecipient {
  // ... existing fields
  deliveredAt DateTime?
  openedAt    DateTime?
  clickedAt   DateTime?
  bouncedAt   DateTime?
  bounceReason String?
}
```

---

#### 8. Template Preview API
**Why**: Preview before sending to avoid mistakes
**Estimated Time**: 2 hours
**Impact**: LOW - quality of life

**What to implement**:
```typescript
// POST /api/templates/[id]/preview
// Body: { sampleData: { name: "John", ... } }
// Returns: Rendered HTML with sample data
```

---

#### 9. Docker Setup & Deployment
**Why**: Consistent deployment, easy to run
**Estimated Time**: 3-4 hours
**Impact**: MEDIUM - DevOps

**Files to create**:
```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=file:./data/db.sqlite
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./data:/app/data
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  worker:
    build: .
    command: npm run worker
    depends_on:
      - redis
```

---

#### 10. Organization Management Features
**Why**: Multi-tenant features need UI
**Estimated Time**: 6-8 hours
**Impact**: MEDIUM - user experience

**What to implement**:
1. Organization switcher UI (navbar dropdown)
2. Organization settings page
   - Update name
   - View members
   - Leave organization
3. User invitation system
   - Invite by email
   - Accept/decline invitations
   - Set roles (owner/admin/member)
4. Organization creation page (create new org)

---

### **LOW PRIORITY (Future)**

#### 11. Template Versioning
**Why**: Rollback changes, audit history
**Estimated Time**: 5-6 hours

#### 12. User Permissions/RBAC
**Why**: Fine-grained access control
**Estimated Time**: 4-5 hours

#### 13. CI/CD Pipeline
**Why**: Automated testing & deployment
**Estimated Time**: 3-4 hours

#### 14. Advanced Analytics
**Why**: Business insights
**Estimated Time**: 8-10 hours

---

## 📅 Recommended Implementation Timeline

### **Week 1: Fix Foundation**
- Day 1-2: Fix all 68 failing tests (6 hours)
- Day 3-4: Implement background job system (8 hours)
- Day 5: Implement unsubscribe feature (4 hours)

**Goal**: Core functionality working & tested

---

### **Week 2: Security & Monitoring**
- Day 1: Add rate limiting (3 hours)
- Day 2: Add error monitoring & logging (4 hours)
- Day 3: Implement input sanitization (3 hours)
- Day 4-5: Email delivery tracking (5 hours)

**Goal**: Production-ready security & observability

---

### **Week 3: DevOps & UX**
- Day 1-2: Docker setup & deployment (4 hours)
- Day 3: Template preview API (2 hours)
- Day 4-5: Organization management UI (8 hours)

**Goal**: Easy to deploy & good user experience

---

## 🎯 Quick Wins (Do These First)

If you only have a few hours, prioritize these:

1. **Fix critical tests** (2 hours)
   - Templates API tests
   - Campaigns API tests
   - Get to at least 100/129 passing

2. **Add unsubscribe** (2 hours)
   - Database model
   - Basic unsubscribe page
   - Legal compliance ✓

3. **Basic background jobs** (3 hours)
   - Node-cron for scheduled campaigns
   - Simple email sending loop
   - No Redis needed initially

**Total: 7 hours to critical functionality**

---

## 🚨 CRITICAL WARNINGS

### What's Currently Broken:
1. ❌ **68 tests failing** - Can't safely make changes
2. ❌ **Emails don't send automatically** - Manual trigger only
3. ❌ **No unsubscribe** - Legal liability (CAN-SPAM violation)

### What's Missing But App Works:
- Rate limiting (can be abused)
- Error monitoring (blind in production)
- Email tracking (no analytics)
- Docker setup (harder to deploy)

---

## 🎓 Technical Debt Identified

1. **Test coverage gaps** - Multi-tenancy broke many tests
2. **No integration tests** - Only unit tests
3. **No E2E tests** - User flows untested
4. **Console.error logging** - Need structured logging
5. **No database backups** - Data loss risk
6. **Temp file cleanup** - PDFs not cleaned up properly
7. **No API versioning** - Breaking changes will hurt users

---

## 📚 Resources & Documentation

### Useful Libraries:
- **BullMQ**: https://docs.bullmq.io/
- **@upstash/ratelimit**: https://github.com/upstash/ratelimit
- **Sentry**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Pino**: https://github.com/pinojs/pino
- **DOMPurify**: https://github.com/cure53/DOMPurify
- **Prisma**: https://www.prisma.io/docs

### Next.js Resources:
- Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Testing: https://nextjs.org/docs/app/building-your-application/testing

---

## ✅ Success Metrics

### After Week 1:
- [ ] All tests passing (129/129)
- [ ] Emails send automatically
- [ ] CAN-SPAM compliant (unsubscribe works)

### After Week 2:
- [ ] Rate limiting active
- [ ] Error monitoring in production
- [ ] XSS vulnerabilities addressed

### After Week 3:
- [ ] Docker deployable
- [ ] Users can manage organizations
- [ ] Email analytics working

---

**Last Updated**: 2025-11-06
**Next Review**: After implementing background jobs
**Contact**: Check project README for maintainer info
