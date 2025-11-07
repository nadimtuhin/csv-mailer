/**
 * Mock implementation of sanitize module for tests
 * This avoids ESM module parsing issues with isomorphic-dompurify
 * The sanitization logic itself should be tested in dedicated unit tests
 */

export function sanitizeHTML(html: string, level?: 'email' | 'basic' | 'plain'): string {
  // Return the input as-is for testing purposes
  // In real implementation, this would sanitize the HTML
  return html;
}

export function sanitizeName(name: string, maxLength?: number): string {
  // Return the input as-is for testing purposes
  const trimmed = name.trim();
  if (maxLength && trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}

export function sanitizeEmail(email: string): string {
  // Return the input as-is for testing purposes
  return email.trim().toLowerCase();
}

export function sanitizeEmailSubject(subject: string): string {
  // Return the input as-is for testing purposes
  return subject.trim();
}

export function sanitizePlainText(text: string, maxLength?: number): string {
  // Return the input as-is for testing purposes
  const trimmed = text.trim();
  if (maxLength && trimmed.length > maxLength) {
    return trimmed.substring(0, maxLength);
  }
  return trimmed;
}
