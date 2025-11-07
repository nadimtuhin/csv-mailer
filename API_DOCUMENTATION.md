# CSV Mailer API Documentation

## Overview

This document provides comprehensive documentation for all API endpoints in the CSV Mailer application.

---

## Authentication Endpoints

### POST /api/auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Validation:**
- Email must be valid format
- Password must be at least 8 characters

**Responses:**
- `201 Created`: User created successfully
- `400 Bad Request`: Invalid input
- `409 Conflict`: User already exists
- `500 Internal Server Error`: Database error

---

### POST /api/auth/login
Authenticate a user and receive a JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Responses:**
- `200 OK`: Login successful, JWT cookie set
- `400 Bad Request`: Missing credentials
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Database error

**Cookie Set:**
- Name: `authToken`
- HttpOnly: true
- SameSite: lax
- Expires: 1 day

---

### POST /api/auth/logout
Clear authentication token.

**Responses:**
- `200 OK`: Logged out successfully

---

## Template Endpoints

### GET /api/templates
Retrieve list of templates.

**Query Parameters:**
- `includeArchived` (optional): Set to 'true' to include archived templates

**Responses:**
- `200 OK`: Array of templates
- `500 Internal Server Error`: Database error

**Example Response:**
```json
[
  {
    "id": "template-id",
    "name": "Welcome Email",
    "htmlContent": "<p>Hello {{name}}</p>",
    "isArchived": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### POST /api/templates
Create a new template.

**Request Body:**
```json
{
  "name": "My Template",
  "htmlContent": "<p>Hello {{name}}</p>"
}
```

**Responses:**
- `201 Created`: Template created successfully
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Database error

---

### PUT /api/templates
Update an existing template.

**Request Body:**
```json
{
  "id": "template-id",
  "name": "Updated Template",
  "htmlContent": "<p>Updated content</p>"
}
```

**Responses:**
- `200 OK`: Template updated successfully
- `400 Bad Request`: Invalid input or archived template
- `404 Not Found`: Template not found
- `500 Internal Server Error`: Database error

---

### DELETE /api/templates?id={templateId}
Archive a template (soft delete).

**Query Parameters:**
- `id`: Template ID to archive

**Responses:**
- `200 OK`: Template archived successfully
- `400 Bad Request`: Missing ID or already archived
- `404 Not Found`: Template not found
- `500 Internal Server Error`: Database error

---

### GET /api/templates/[templateId]
Retrieve a specific template by ID.

**Responses:**
- `200 OK`: Template object
- `400 Bad Request`: Missing template ID
- `404 Not Found`: Template not found or archived
- `500 Internal Server Error`: Database error

---

### PUT /api/templates/[templateId]
Update a specific template (with Zod validation).

**Request Body:**
```json
{
  "name": "Updated Name",
  "htmlContent": "<p>Updated content</p>"
}
```

**Validation:**
- Name must not be empty
- HTML content must not be empty

**Responses:**
- `200 OK`: Template updated
- `400 Bad Request`: Validation error or archived template
- `404 Not Found`: Template not found
- `500 Internal Server Error`: Database error

---

### PATCH /api/templates/[templateId]
Archive or unarchive a template.

**Responses:**
- `200 OK`: Template archived/unarchived
- `400 Bad Request`: Missing template ID
- `404 Not Found`: Template not found
- `500 Internal Server Error`: Database error

---

## Campaign Endpoints

### GET /api/campaigns
List all campaigns.

**Query Parameters:**
- `includeArchived` (optional): Include archived campaigns
- `limit` (optional): Limit number of results

**Responses:**
- `200 OK`: Array of campaigns
- `400 Bad Request`: Invalid limit parameter
- `500 Internal Server Error`: Database error

**Example Response:**
```json
[
  {
    "id": "campaign-id",
    "name": "Monthly Newsletter",
    "status": "completed",
    "totalRecipients": 100,
    "sentCount": 95,
    "failedCount": 5,
    "skippedCount": 0,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "scheduledAt": null
  }
]
```

---

### POST /api/campaigns
Create a new email campaign.

**Request Body:**
```json
{
  "recipients": [
    { "email": "user1@example.com", "name": "User 1" },
    { "email": "user2@example.com", "name": "User 2" }
  ],
  "templateId": "template-id",
  "templateHtml": "<p>Hello {{name}}</p>",
  "subject": "Email Subject",
  "fromEmail": "sender@example.com",
  "fromName": "Sender Name",
  "replyToEmail": "reply@example.com",
  "campaignName": "Campaign Name",
  "scheduledAt": "2024-12-31T23:59:59.000Z",
  "pdfTemplatePath": "/path/to/pdf"
}
```

**Required Fields:**
- recipients (array with valid emails)
- subject
- fromEmail
- replyToEmail
- templateId OR templateHtml

**Validation:**
- Recipients must not be empty
- Email addresses validated and filtered
- Scheduled date must be in future (if provided)
- PDF path must be in allowed directory

**Responses:**
- `201 Created`: Campaign created
- `400 Bad Request`: Validation errors
- `500 Internal Server Error`: Database error

---

### GET /api/campaigns/[campaignId]
Get detailed information about a campaign.

**Responses:**
- `200 OK`: Campaign object with recipients
- `400 Bad Request`: Missing campaign ID
- `404 Not Found`: Campaign not found
- `500 Internal Server Error`: Database error

**Example Response:**
```json
{
  "id": "campaign-id",
  "name": "Campaign Name",
  "status": "completed",
  "totalRecipients": 3,
  "sentCount": 2,
  "failedCount": 1,
  "recipients": [
    {
      "id": "recipient-id",
      "recipientEmail": "user@example.com",
      "status": "sent",
      "errorMessage": null,
      "processedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### PATCH /api/campaigns/[campaignId]
Archive a campaign.

**Responses:**
- `200 OK`: Campaign archived
- `400 Bad Request`: Missing campaign ID
- `404 Not Found`: Campaign not found
- `500 Internal Server Error`: Database error

---

## Common Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters or validation error
- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `500 Internal Server Error`: Server or database error

---

## Error Response Format

All error responses follow this format:
```json
{
  "error": "Error message description",
  "message": "Detailed error information"
}
```

---

## Template Variables

Templates support variable substitution using double curly braces:
- `{{name}}` - Recipient name
- `{{email}}` - Recipient email
- `{{any_column}}` - Any column from CSV data

Example:
```html
<p>Hello {{name}},</p>
<p>Your email is {{email}}</p>
```

---

## Campaign Status Values

- `pending`: Campaign created, not yet queued
- `queued`: Campaign queued for processing
- `scheduled`: Campaign scheduled for future
- `processing`: Currently sending emails
- `completed`: All emails sent
- `failed`: Campaign failed

---

## Recipient Status Values

- `pending`: Not yet processed
- `sent`: Email sent successfully
- `failed`: Email failed to send
- `skipped`: Recipient skipped (invalid email)

---

## Authentication Flow

1. User signs up via `/api/auth/signup`
2. User logs in via `/api/auth/login`
3. JWT token stored in HTTP-only cookie
4. Token automatically sent with subsequent requests
5. User logs out via `/api/auth/logout`

---

## Best Practices

### Security
- Always use HTTPS in production
- JWT tokens expire after 24 hours
- Passwords hashed with bcrypt (10 rounds)
- Input validation on all endpoints

### Performance
- Use pagination with `limit` parameter
- Filter archived items by default
- Bulk operations for recipients

### Error Handling
- Always check response status codes
- Parse error messages for user feedback
- Handle network timeouts gracefully

---

## Test Coverage

**Total Tests: 105**

### API Endpoints
- Templates: 19 tests
- Templates by ID: 18 tests
- Campaigns: 31 tests
- Auth: 17 tests

### Utilities
- Validation: 24 tests

All endpoints include tests for:
- Success scenarios
- Validation errors
- Not found errors
- Database errors
- Edge cases

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding:
- Per-IP rate limits
- Per-user rate limits
- Campaign creation throttling

---

## Future Enhancements

- [ ] Template versioning
- [ ] Campaign analytics
- [ ] Webhook notifications
- [ ] Email open tracking
- [ ] Link click tracking
- [ ] A/B testing support
- [ ] Template preview API
- [ ] Bulk template operations

---

For questions or issues, please refer to the GitHub repository.
