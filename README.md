# CSV Mailer

A powerful, multi-tenant email campaign platform built with Next.js that enables organizations to send personalized bulk emails using CSV data and customizable templates.

## Features

### Core Functionality

- **Bulk Email Campaigns**: Send personalized emails to thousands of recipients using CSV data
- **Rich Template Editor**: Create beautiful email templates with a WYSIWYG editor (TipTap)
- **Template Management**:
  - Create, edit, and archive HTML email templates
  - Upload DOCX templates and convert to HTML
  - Upload PDF templates for attachments
  - Variable substitution (e.g., `{{name}}`, `{{email}}`)
- **Campaign Scheduling**: Schedule campaigns for future delivery
- **Campaign Tracking**: Monitor sent, failed, and skipped email counts
- **CSV Import**: Upload recipient lists with custom fields via CSV
- **Background Job Processing**: Asynchronous email sending with BullMQ and Redis
- **Automatic Unsubscribe**: CAN-SPAM compliant unsubscribe functionality
- **Template Preview**: Preview email templates with sample data

### Multi-Tenancy

- **Organization-Based Isolation**: Complete data separation between organizations
- **Role-Based Access**: Owner, admin, and member roles
- **Multiple Organizations**: Users can belong to multiple organizations
- **Automatic Organization Creation**: New org created on signup

### Authentication & Security

- **Email/Password Authentication**: Traditional signup and login with bcrypt password hashing
- **Google OAuth**: Sign in with Google (OAuth 2.0)
- **JWT-Based Sessions**: Secure, HTTP-only cookie sessions
- **CSRF Protection**: State parameter validation for OAuth flows
- **Tenant Isolation**: Middleware enforces organization-level access control
- **Email Verification**: OAuth requires verified email addresses
- **Input Sanitization**: XSS prevention with DOMPurify
- **API Rate Limiting**: Upstash Redis-based rate limiting (optional)
  - Auth endpoints: 5 requests per 15 minutes
  - Email processing: 10 requests per minute per organization
  - General API: 100 requests per minute
  - File uploads: 20 uploads per hour

### API Features

- RESTful API endpoints for all operations
- Protected routes with JWT authentication
- Organization-scoped data access
- Comprehensive error handling
- Automatic rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: SQLite with Prisma ORM
- **Authentication**: JWT (jose) + bcrypt
- **Email Service**: SendGrid
- **Background Jobs**: BullMQ + Redis
- **Rich Text Editor**: TipTap
- **OAuth**: Google OAuth 2.0 (googleapis)
- **File Processing**:
  - PDF: pdf-lib
  - DOCX: mammoth
  - CSV: papaparse
- **Validation**: Zod
- **Sanitization**: DOMPurify (XSS prevention)
- **Rate Limiting**: @upstash/ratelimit + @upstash/redis (optional)
- **Styling**: Tailwind CSS 4
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm, yarn, pnpm, or bun
- Redis (for background job processing)
- SendGrid API key (for sending emails)
- Google OAuth credentials (optional, for Google sign-in)
- Upstash Redis (optional, for API rate limiting)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd csv-mailer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure the following variables:
```env
# Database
DATABASE_URL="file:./dev.db"

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET="your-secret-key-here"

# SendGrid
SENDGRID_API_KEY="your-sendgrid-api-key"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

5. Install and start Redis (for background jobs):

**macOS (using Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

6. Run the development server:
```bash
npm run dev
```

7. In a separate terminal, start the background workers:
```bash
npm run workers
```

This starts three workers:
- **Email Worker**: Processes individual email sending jobs
- **Campaign Scheduler**: Processes campaigns and queues emails
- **Cron Scheduler**: Checks for scheduled campaigns every minute

8. Open [http://localhost:3000](http://localhost:3000) in your browser

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Project Structure

```
csv-mailer/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   │   ├── auth/         # Authentication endpoints
│   │   │   ├── campaigns/    # Campaign management
│   │   │   ├── templates/    # Template management
│   │   │   └── send-emails/  # Email sending
│   │   ├── campaigns/        # Campaign pages
│   │   ├── templates/        # Template pages
│   │   ├── dashboard/        # Dashboard page
│   │   └── login/            # Auth pages
│   ├── lib/                   # Utility libraries
│   │   ├── prisma.ts         # Prisma client
│   │   ├── googleOAuth.ts    # Google OAuth helpers
│   │   └── env.ts            # Environment validation
│   ├── utils/                 # Helper functions
│   │   ├── validation.ts     # Input validation
│   │   └── templateHelper.ts # Template processing
│   ├── types/                 # TypeScript types
│   └── middleware.ts          # Auth & tenant middleware
├── prisma/
│   └── schema.prisma          # Database schema
└── __tests__/                 # Test files
```

## Database Schema

### Core Models

- **User**: User accounts with email/password or OAuth
- **Organization**: Multi-tenant organizations
- **UserOrganization**: User-organization membership with roles
- **Template**: Email templates with HTML content
- **Campaign**: Email campaigns with tracking
- **CampaignRecipient**: Individual recipient status tracking

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback

### Templates
- `GET /api/templates` - List templates (organization-scoped)
- `POST /api/templates` - Create template
- `GET /api/templates/[id]` - Get template details
- `PUT /api/templates/[id]` - Update template
- `DELETE /api/templates/[id]` - Archive template
- `POST /api/templates/upload-docx` - Upload DOCX template

### Campaigns
- `GET /api/campaigns` - List campaigns (organization-scoped)
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/[id]` - Get campaign details
- `PUT /api/campaigns/[id]` - Update campaign
- `DELETE /api/campaigns/[id]` - Archive campaign
- `POST /api/campaigns/[id]/process` - Trigger campaign processing

### PDF
- `POST /api/pdf/upload-template` - Upload PDF template

## Usage Guide

### Creating an Email Campaign

1. **Create a Template**:
   - Navigate to Templates
   - Click "New Template"
   - Use the rich text editor to design your email
   - Use variables like `{{name}}` for personalization
   - Save the template

2. **Prepare Your CSV**:
   ```csv
   email,name,company
   john@example.com,John Doe,Acme Inc
   jane@example.com,Jane Smith,Tech Corp
   ```

3. **Create a Campaign**:
   - Navigate to Campaigns
   - Click "New Campaign"
   - Select a template
   - Upload your CSV file
   - Configure sender details
   - Set subject line (supports variables)
   - Schedule or send immediately

4. **Monitor Progress**:
   - View campaign details
   - Track sent/failed/skipped counts
   - Check individual recipient status

### Template Variables

Templates support variable substitution from CSV columns:
- `{{email}}` - Recipient's email
- `{{name}}` - Any column from your CSV
- `{{company}}` - Custom fields from CSV

Example template:
```html
<p>Hi {{name}},</p>
<p>Thank you for your interest in {{company}}.</p>
```

## Multi-Tenancy

### Organization Isolation

All data is automatically scoped to the user's current organization:
- Templates belong to organizations
- Campaigns belong to organizations
- Users can switch between organizations
- No cross-tenant data access

### Roles

- **Owner**: Full control, can delete organization
- **Admin**: Manage templates, campaigns, and members
- **Member**: Create and manage own campaigns

## Security Features

- Password hashing with bcrypt (10 rounds)
- JWT tokens in HTTP-only cookies
- CSRF protection for OAuth
- Email verification requirement for OAuth
- Middleware-enforced tenant isolation
- SQL injection prevention via Prisma
- Input validation with Zod

## Environment Variables

See `.env.example` for all available configuration options.

### Required Variables
- `DATABASE_URL` - Database connection string
- `JWT_SECRET` - Secret for JWT token signing
- `SENDGRID_API_KEY` - SendGrid API key for sending emails

### Optional Variables
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL
- `REDIS_URL` - Redis connection URL (defaults to redis://localhost:6379)

## Background Jobs

CSV Mailer uses BullMQ and Redis for background job processing, enabling:

### Features

- **Asynchronous Email Sending**: Emails are queued and sent in the background
- **Automatic Retries**: Failed emails retry with exponential backoff (5 attempts)
- **Rate Limiting**: Respects SendGrid rate limits (100 emails/second)
- **Scheduled Campaigns**: Automatic processing of scheduled campaigns
- **Concurrent Processing**: Multiple workers process jobs in parallel
- **Unsubscribe Filtering**: Automatically skips unsubscribed recipients

### Workers

**Email Processor** (`worker:email`)
- Processes individual email sending jobs
- Concurrency: 10 emails at a time
- Rate limit: 100 jobs per second
- Handles PDF attachments and template personalization
- Adds unsubscribe links to all emails

**Campaign Scheduler** (`worker:scheduler`)
- Processes campaigns and queues email jobs
- Fetches recipients in batches of 1000
- Updates campaign status (processing → completed)
- Cleans up temporary PDF files

**Cron Scheduler** (`worker:cron`)
- Runs every 60 seconds
- Checks for scheduled campaigns
- Automatically queues campaigns when scheduled time is reached

### Running Workers

```bash
# Run all workers together
npm run workers

# Or run individually
npm run worker:email       # Email processor
npm run worker:scheduler   # Campaign scheduler
npm run worker:cron        # Scheduled campaign checker
```

### Monitoring

You can monitor queue status via Redis CLI:

```bash
redis-cli
> KEYS bull:*
> LLEN bull:email-campaign:waiting
> LLEN bull:email-campaign:active
```

## API Rate Limiting

CSV Mailer supports optional API rate limiting using Upstash Redis to protect against abuse and ensure fair usage.

### Configuration

Rate limiting requires Upstash Redis credentials. If not configured, all requests pass through without rate limiting.

1. **Sign up for Upstash**: Visit [https://console.upstash.com/](https://console.upstash.com/)
2. **Create a Redis database**: Choose a region close to your deployment
3. **Get credentials**: Copy REST URL and REST Token
4. **Add to `.env`**:

```env
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

### Rate Limits

Different endpoints have different rate limits based on their sensitivity:

| Endpoint Type | Limit | Window | Identifier |
|--------------|-------|--------|------------|
| Authentication (login, signup) | 5 requests | 15 minutes | IP address |
| Email Processing | 10 requests | 1 minute | Organization ID |
| General API (CRUD operations) | 100 requests | 1 minute | IP address |
| File Uploads | 20 uploads | 1 hour | IP address |

### Response Headers

When rate limiting is enabled, all responses include:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

### Rate Limit Exceeded

When rate limit is exceeded, the API returns:
- **Status Code**: `429 Too Many Requests`
- **Response Body**:
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "limit": 100,
  "remaining": 0,
  "reset": "2024-01-15T10:30:00.000Z"
}
```
- **Headers**: `Retry-After` header indicates seconds until retry

### Customization

Rate limits can be adjusted in `src/lib/ratelimit.ts`:

```typescript
export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // Adjust here
      analytics: true,
    })
  : null;
```

## Development

### Database Migrations

After modifying `prisma/schema.prisma`:

```bash
# Apply changes to database
npx prisma db push

# Regenerate Prisma Client
npx prisma generate

# View database in Prisma Studio
npx prisma studio
```

### Code Quality

```bash
# Run linter
npm run lint

# Format code
npx prettier --write .
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker (Coming Soon)

Docker support is planned for easy self-hosting.

## Known Limitations

1. **No Email Tracking**: No open/click tracking (SendGrid webhooks not implemented)
2. **Redis Dependency**: Background jobs require Redis to be running

See [NEXT_STEPS.md](NEXT_STEPS.md) for planned improvements.

## Roadmap

### Recently Completed
- [x] Background job system (BullMQ + Redis)
- [x] Unsubscribe functionality (CAN-SPAM compliance)
- [x] Input sanitization (XSS prevention)
- [x] Template preview API
- [x] Scheduled campaign automation
- [x] Automatic retry for failed emails

### Immediate Priorities
- [ ] Email delivery tracking (SendGrid webhooks)
- [ ] API rate limiting
- [ ] Queue monitoring dashboard

### Future Features
- [ ] Template versioning
- [ ] Advanced analytics
- [ ] A/B testing
- [ ] Email bounce handling
- [ ] Organization management UI
- [ ] User permissions/RBAC

## Testing

Current test coverage: **86/92 tests passing**

Tests cover:
- Authentication (signup, login, OAuth)
- Template CRUD operations
- Campaign management
- Multi-tenancy isolation
- Input validation
- Sanitization and XSS prevention

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Add your license here]

## Support

For issues and questions:
- Check [NEXT_STEPS.md](NEXT_STEPS.md) for known issues
- Open an issue on GitHub
- Review existing tests for examples

## Acknowledgments

- Built with Next.js
- Email delivery by SendGrid
- Rich text editing by TipTap
- Database by Prisma

---

**Note**: This project is under active development. See [NEXT_STEPS.md](NEXT_STEPS.md) for detailed technical roadmap and current status.
