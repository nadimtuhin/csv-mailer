/**
 * Validation utilities for API endpoints
 */

/**
 * Validates if a string is a valid email address
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }
  // Basic email regex pattern
  return /\S+@\S+\.\S+/.test(email);
}

/**
 * Validates multiple email addresses
 * @param emails - Array of email addresses
 * @returns Array of valid email addresses
 */
export function filterValidEmails(emails: string[]): string[] {
  return emails.filter(isValidEmail);
}

/**
 * Validates if a date is in the future
 * @param date - Date to validate
 * @returns true if date is in the future, false otherwise
 */
export function isFutureDate(date: Date): boolean {
  return date > new Date();
}

/**
 * Safely parses a date string
 * @param dateString - ISO date string
 * @returns Date object or null if invalid
 */
export function parseDate(dateString: string): Date | null {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Validates password strength
 * @param password - Password to validate
 * @param minLength - Minimum password length (default: 8)
 * @returns Object with isValid flag and error message
 */
export function validatePassword(
  password: string,
  minLength: number = 8
): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters long`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes HTML content to prevent XSS
 * Note: This is a basic sanitization. Consider using a library like DOMPurify for production
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Basic sanitization - remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '');
}

/**
 * Validates template name
 * @param name - Template name to validate
 * @returns Object with isValid flag and error message
 */
export function validateTemplateName(
  name: string
): { isValid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { isValid: false, error: 'Template name is required' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Template name cannot be empty' };
  }

  if (trimmed.length > 255) {
    return {
      isValid: false,
      error: 'Template name must be less than 255 characters',
    };
  }

  return { isValid: true };
}

/**
 * Validates campaign subject
 * @param subject - Email subject to validate
 * @returns Object with isValid flag and error message
 */
export function validateSubject(
  subject: string
): { isValid: boolean; error?: string } {
  if (!subject || typeof subject !== 'string') {
    return { isValid: false, error: 'Subject is required' };
  }

  const trimmed = subject.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Subject cannot be empty' };
  }

  if (trimmed.length > 500) {
    return {
      isValid: false,
      error: 'Subject must be less than 500 characters',
    };
  }

  return { isValid: true };
}
