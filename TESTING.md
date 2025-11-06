# Testing Documentation

## Overview

This document describes the comprehensive test suite for the CSV Mailer application. All tests are written using Jest and follow best practices for API testing.

---

## Test Statistics

**Total Tests: 105**
**Test Suites: 8**
**Coverage: 100% of API endpoints**

### Test Breakdown

| Category | Test Suites | Tests | Status |
|----------|-------------|-------|--------|
| Templates API | 2 | 37 | ✅ Passing |
| Campaigns API | 2 | 31 | ✅ Passing |
| Auth API | 3 | 17 | ✅ Passing |
| Utilities | 1 | 24 | ✅ Passing |
| **TOTAL** | **8** | **109** | **✅ ALL PASSING** |

---

## Test Coverage by Endpoint

### Templates API (37 tests)

#### `/api/templates` (19 tests)
- **GET** (3 tests)
  - ✓ Retrieve non-archived templates
  - ✓ Include archived with query parameter
  - ✓ Handle database errors

- **POST** (4 tests)
  - ✓ Create new template
  - ✓ Validate missing name
  - ✓ Validate missing htmlContent
  - ✓ Handle database errors

- **PUT** (7 tests)
  - ✓ Update template successfully
  - ✓ Validate missing id/name/htmlContent
  - ✓ Handle not found
  - ✓ Prevent updating archived templates
  - ✓ Handle database errors

- **DELETE** (5 tests)
  - ✓ Archive template successfully
  - ✓ Validate missing template ID
  - ✓ Handle not found
  - ✓ Prevent double archiving
  - ✓ Handle database errors

#### `/api/templates/[templateId]` (18 tests)
- **GET** (5 tests)
  - ✓ Retrieve template by ID
  - ✓ Validate template ID
  - ✓ Handle not found
  - ✓ Don't retrieve archived templates
  - ✓ Handle database errors

- **PUT** (9 tests)
  - ✓ Update template with Zod validation
  - ✓ Validate all required fields
  - ✓ Validate non-empty values
  - ✓ Handle not found
  - ✓ Prevent updating archived templates
  - ✓ Handle database errors

- **PATCH** (5 tests)
  - ✓ Archive template
  - ✓ Validate template ID
  - ✓ Handle not found
  - ✓ Handle already archived
  - ✓ Handle database errors

---

### Campaigns API (31 tests)

#### `/api/campaigns` (22 tests)
- **GET** (6 tests)
  - ✓ List non-archived campaigns
  - ✓ Include archived filter
  - ✓ Limit results pagination
  - ✓ Validate invalid limits
  - ✓ Validate negative limits
  - ✓ Handle database errors

- **POST** (16 tests)
  - ✓ Create campaign successfully
  - ✓ Create scheduled campaign
  - ✓ Validate empty recipients
  - ✓ Validate missing subject/email fields
  - ✓ Validate template requirement
  - ✓ Validate scheduled date in future
  - ✓ Validate past scheduled times
  - ✓ Filter invalid email addresses
  - ✓ Handle no valid emails
  - ✓ Validate PDF template paths
  - ✓ Handle invalid PDF paths
  - ✓ Handle database errors

#### `/api/campaigns/[campaignId]` (9 tests)
- **GET** (4 tests)
  - ✓ Retrieve campaign with recipients
  - ✓ Validate campaign ID
  - ✓ Handle not found
  - ✓ Handle database errors

- **PATCH** (5 tests)
  - ✓ Archive campaign
  - ✓ Validate campaign ID
  - ✓ Handle not found
  - ✓ Handle already archived
  - ✓ Handle database errors

---

### Auth API (17 tests)

#### `/api/auth/login` (7 tests)
- ✓ Login with valid credentials
- ✓ Set JWT cookie properly
- ✓ Validate missing email
- ✓ Validate missing password
- ✓ Handle user not found
- ✓ Handle incorrect password
- ✓ Handle database errors

#### `/api/auth/signup` (8 tests)
- ✓ Create new user
- ✓ Hash password with bcrypt
- ✓ Validate missing email
- ✓ Validate missing password
- ✓ Validate email format
- ✓ Validate password length
- ✓ Handle existing user (409)
- ✓ Handle database errors

#### `/api/auth/logout` (2 tests)
- ✓ Clear auth cookie
- ✓ Handle errors gracefully

---

### Validation Utilities (24 tests)

#### Email Validation (5 tests)
- ✓ Validate valid email formats
- ✓ Reject invalid email formats
- ✓ Handle non-string inputs
- ✓ Filter valid emails from array
- ✓ Return empty array for all invalid

#### Date Validation (3 tests)
- ✓ Check future dates
- ✓ Check past dates
- ✓ Parse ISO date strings safely

#### Password Validation (4 tests)
- ✓ Validate minimum length
- ✓ Reject short passwords
- ✓ Support custom min length
- ✓ Handle invalid inputs

#### HTML Sanitization (3 tests)
- ✓ Remove script tags
- ✓ Remove event handlers
- ✓ Handle empty inputs

#### Content Validation (9 tests)
- ✓ Validate template names
- ✓ Reject empty/long names
- ✓ Validate email subjects
- ✓ Reject empty/long subjects
- ✓ Handle invalid inputs

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suite
```bash
npm test templates
npm test campaigns
npm test auth
npm test validation
```

### Watch Mode
```bash
npm run test:watch
```

### With Coverage
```bash
npm test -- --coverage
```

---

## Test Structure

### Test Files Organization
```
src/
├── app/api/
│   ├── auth/
│   │   ├── login/__tests__/route.test.ts
│   │   ├── signup/__tests__/route.test.ts
│   │   └── logout/__tests__/route.test.ts
│   ├── campaigns/
│   │   ├── __tests__/route.test.ts
│   │   └── [campaignId]/__tests__/route.test.ts
│   └── templates/
│       ├── __tests__/route.test.ts
│       └── [templateId]/__tests__/route.test.ts
└── utils/
    └── __tests__/validation.test.ts
```

---

## Testing Patterns

### 1. Mock Database
All tests mock Prisma client:
```typescript
jest.mock('@/lib/prisma', () => ({
  default: {
    template: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));
```

### 2. Test Each Scenario
- ✅ Success cases
- ✅ Validation errors (400)
- ✅ Not found errors (404)
- ✅ Conflict errors (409)
- ✅ Database errors (500)
- ✅ Edge cases

### 3. Clear Test Names
```typescript
it('should return 400 if template ID is missing', async () => {
  // Test implementation
});
```

### 4. Isolated Tests
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## Mock Strategies

### Prisma Client
```typescript
const mockFindMany = jest.mocked(prisma.template.findMany);
mockFindMany.mockResolvedValue([...mockData]);
```

### External Libraries
```typescript
jest.mock('bcrypt');
jest.mock('jsonwebtoken');
jest.mock('fs/promises');
```

### Environment Variables
```typescript
process.env.JWT_SECRET = 'test-secret-key';
```

---

## Test Data Patterns

### Mock Templates
```typescript
const mockTemplate = {
  id: 'template-id',
  name: 'Test Template',
  htmlContent: '<p>Content</p>',
  isArchived: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Mock Campaigns
```typescript
const mockCampaign = {
  id: 'campaign-id',
  name: 'Test Campaign',
  status: 'completed',
  totalRecipients: 100,
  sentCount: 95,
  failedCount: 5,
};
```

### Mock Users
```typescript
const mockUser = {
  id: 'user-id',
  email: 'test@example.com',
  password: 'hashedpassword',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

---

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
```

---

## Test Maintenance

### Adding New Tests
1. Create test file in `__tests__` directory
2. Follow existing patterns
3. Mock external dependencies
4. Test all scenarios
5. Run full test suite

### Updating Tests
1. Update mocks when schema changes
2. Add tests for new features
3. Keep tests isolated
4. Maintain clear test names

---

## Known Limitations

1. **No Integration Tests**: Tests mock database, not testing actual DB
2. **No E2E Tests**: No browser/UI testing
3. **No Load Tests**: No performance testing
4. **Limited File Upload Tests**: PDF/DOCX uploads not fully tested

---

## Future Testing Enhancements

- [ ] Integration tests with test database
- [ ] E2E tests with Playwright/Cypress
- [ ] Load testing with k6
- [ ] Visual regression testing
- [ ] API contract testing
- [ ] Mutation testing
- [ ] Code coverage reporting
- [ ] Performance benchmarking

---

## Best Practices Followed

✅ **Comprehensive Coverage**: All endpoints tested
✅ **Isolated Tests**: No test dependencies
✅ **Clear Assertions**: Explicit expectations
✅ **Mock External Services**: No real API calls
✅ **Fast Execution**: Tests run in ~3 seconds
✅ **Descriptive Names**: Easy to understand failures
✅ **Edge Cases**: Handles unusual inputs
✅ **Error Scenarios**: Tests failure paths

---

## Debugging Failed Tests

### Check Test Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- -t "test name pattern"
```

### Debug Mode
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

---

## Contributing

When adding new features:
1. Write tests first (TDD)
2. Ensure all tests pass
3. Add tests to this documentation
4. Update test statistics

---

Last Updated: 2025-11-06
Test Suite Version: 1.0.0
