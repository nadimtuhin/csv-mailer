import DOMPurify from 'isomorphic-dompurify';

/**
 * Configuration for different sanitization levels
 */
const SANITIZE_CONFIG = {
  // For email templates - allow rich HTML but remove scripts and dangerous attributes
  EMAIL_TEMPLATE: {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'blockquote', 'pre', 'code',
      'hr',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title',
      'class', 'style',
      'width', 'height',
      'align', 'border', 'cellpadding', 'cellspacing',
      'target', 'rel',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  },

  // For plain text fields - strip all HTML
  PLAIN_TEXT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  },

  // For basic formatted text - minimal HTML
  BASIC: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  },
};

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @param level - Sanitization level: 'email', 'basic', or 'plain'
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(
  html: string,
  level: 'email' | 'basic' | 'plain' = 'email'
): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let config;
  switch (level) {
    case 'email':
      config = SANITIZE_CONFIG.EMAIL_TEMPLATE;
      break;
    case 'basic':
      config = SANITIZE_CONFIG.BASIC;
      break;
    case 'plain':
      config = SANITIZE_CONFIG.PLAIN_TEXT;
      break;
    default:
      config = SANITIZE_CONFIG.EMAIL_TEMPLATE;
  }

  return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize email subject line - remove all HTML
 * @param subject - The subject string to sanitize
 * @returns Plain text subject
 */
export function sanitizeEmailSubject(subject: string): string {
  if (!subject || typeof subject !== 'string') {
    return '';
  }

  // Remove all HTML tags
  const withoutHtml = DOMPurify.sanitize(subject, { ALLOWED_TAGS: [] });

  // Remove any control characters and normalize whitespace
  return withoutHtml
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 998); // RFC 2822 recommends max 998 chars per line
}

/**
 * Sanitize email address
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  // Basic email regex - more thorough validation should use Zod
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();

  if (!emailRegex.test(trimmed)) {
    return '';
  }

  // Remove any HTML and dangerous characters
  const cleaned = DOMPurify.sanitize(trimmed, { ALLOWED_TAGS: [] });

  return cleaned.substring(0, 254); // Max email length per RFC 5321
}

/**
 * Sanitize a plain text string (for names, etc.)
 * Removes HTML but preserves line breaks
 * @param text - Text to sanitize
 * @param maxLength - Maximum length (default: 1000)
 * @returns Sanitized text
 */
export function sanitizePlainText(text: string, maxLength = 1000): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Remove HTML tags but preserve line breaks
  const withoutHtml = DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });

  // Remove excessive whitespace but keep single line breaks
  return withoutHtml
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/[ \t]+/g, ' ') // Normalize spaces/tabs to single space
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive line breaks
    .trim()
    .substring(0, maxLength);
}

/**
 * Sanitize campaign/template name
 * @param name - Name to sanitize
 * @returns Sanitized name
 */
export function sanitizeName(name: string): string {
  return sanitizePlainText(name, 200);
}

/**
 * Sanitize CSV data - prevent formula injection
 * @param value - CSV cell value
 * @returns Safe CSV value
 */
export function sanitizeCSVValue(value: string): string {
  if (!value || typeof value !== 'string') {
    return '';
  }

  // Prevent formula injection (Excel, Google Sheets)
  // Remove leading = + - @ characters that could be interpreted as formulas
  const trimmed = value.trim();
  if (/^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`; // Prefix with single quote to force text
  }

  return trimmed;
}
