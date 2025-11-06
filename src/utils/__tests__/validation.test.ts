import {
  isValidEmail,
  filterValidEmails,
  isFutureDate,
  parseDate,
  validatePassword,
  sanitizeHtml,
  validateTemplateName,
  validateSubject,
} from '../validation';

describe('isValidEmail', () => {
  it('should return true for valid email addresses', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name+tag@example.co.uk')).toBe(true);
    expect(isValidEmail('x@y.z')).toBe(true);
  });

  it('should return false for invalid email addresses', () => {
    expect(isValidEmail('invalid')).toBe(false);
    expect(isValidEmail('invalid@')).toBe(false);
    expect(isValidEmail('@invalid.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail('test@')).toBe(false);
  });

  it('should handle non-string inputs', () => {
    expect(isValidEmail(null as any)).toBe(false);
    expect(isValidEmail(undefined as any)).toBe(false);
    expect(isValidEmail(123 as any)).toBe(false);
  });
});

describe('filterValidEmails', () => {
  it('should filter out invalid emails', () => {
    const emails = [
      'valid1@example.com',
      'invalid',
      'valid2@test.com',
      '',
      'also@valid.co',
    ];
    const result = filterValidEmails(emails);
    expect(result).toEqual([
      'valid1@example.com',
      'valid2@test.com',
      'also@valid.co',
    ]);
  });

  it('should return empty array for all invalid emails', () => {
    const emails = ['invalid', '', 'also-invalid'];
    expect(filterValidEmails(emails)).toEqual([]);
  });
});

describe('isFutureDate', () => {
  it('should return true for future dates', () => {
    const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
    expect(isFutureDate(futureDate)).toBe(true);
  });

  it('should return false for past dates', () => {
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    expect(isFutureDate(pastDate)).toBe(false);
  });
});

describe('parseDate', () => {
  it('should parse valid ISO date strings', () => {
    const dateString = '2024-12-31T23:59:59.000Z';
    const result = parseDate(dateString);
    expect(result).toBeInstanceOf(Date);
    expect(result?.toISOString()).toBe(dateString);
  });

  it('should return null for invalid date strings', () => {
    expect(parseDate('invalid-date')).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('should validate passwords with minimum length', () => {
    const result = validatePassword('password123');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject passwords that are too short', () => {
    const result = validatePassword('short');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must be at least 8 characters long');
  });

  it('should support custom minimum length', () => {
    const result = validatePassword('pass', 10);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Password must be at least 10 characters long');
  });

  it('should handle empty or invalid inputs', () => {
    expect(validatePassword('').isValid).toBe(false);
    expect(validatePassword(null as any).isValid).toBe(false);
    expect(validatePassword(undefined as any).isValid).toBe(false);
  });
});

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const html = '<p>Hello</p><script>alert("xss")</script>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Hello</p>');
  });

  it('should remove event handlers', () => {
    const html = '<div onclick="alert(1)">Click</div>';
    const result = sanitizeHtml(html);
    expect(result).not.toContain('onclick');
  });

  it('should handle empty or invalid inputs', () => {
    expect(sanitizeHtml('')).toBe('');
    expect(sanitizeHtml(null as any)).toBe('');
    expect(sanitizeHtml(undefined as any)).toBe('');
  });
});

describe('validateTemplateName', () => {
  it('should validate valid template names', () => {
    const result = validateTemplateName('My Template');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty names', () => {
    expect(validateTemplateName('').isValid).toBe(false);
    expect(validateTemplateName('   ').isValid).toBe(false);
  });

  it('should reject names that are too long', () => {
    const longName = 'a'.repeat(256);
    const result = validateTemplateName(longName);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('less than 255 characters');
  });

  it('should handle invalid inputs', () => {
    expect(validateTemplateName(null as any).isValid).toBe(false);
    expect(validateTemplateName(undefined as any).isValid).toBe(false);
  });
});

describe('validateSubject', () => {
  it('should validate valid subjects', () => {
    const result = validateSubject('Important: Meeting Tomorrow');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty subjects', () => {
    expect(validateSubject('').isValid).toBe(false);
    expect(validateSubject('   ').isValid).toBe(false);
  });

  it('should reject subjects that are too long', () => {
    const longSubject = 'a'.repeat(501);
    const result = validateSubject(longSubject);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('less than 500 characters');
  });

  it('should handle invalid inputs', () => {
    expect(validateSubject(null as any).isValid).toBe(false);
    expect(validateSubject(undefined as any).isValid).toBe(false);
  });
});
