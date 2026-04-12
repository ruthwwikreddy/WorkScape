import DOMPurify from 'dompurify';

// Configure DOMPurify for the app's needs
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  // Allow specific attributes
  if (data.attrName === 'class' || data.attrName === 'style') {
    data.keepAttr = true;
  }
});

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param dirty - The dirty HTML string to sanitize
 * @returns The sanitized HTML string
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'span'],
    ALLOWED_ATTR: ['href', 'class', 'style', 'target'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text content (strips all HTML tags)
 * @param dirty - The dirty string to sanitize
 * @returns The sanitized plain text string
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
}

/**
 * Sanitize user input for display (allows basic formatting)
 * @param dirty - The dirty string to sanitize
 * @returns The sanitized string
 */
export function sanitizeUserInput(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize file names
 * @param dirty - The dirty file name
 * @returns The sanitized file name
 */
export function sanitizeFileName(dirty: string): string {
  // Remove any path traversal attempts and dangerous characters
  const sanitized = dirty
    .replace(/[<>:"|?*]/g, '') // Remove dangerous characters
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[\/\\]/g, '') // Remove directory separators
    .trim();
  
  // Limit length
  return sanitized.substring(0, 255);
}

/**
 * Sanitize room IDs
 * @param dirty - The dirty room ID
 * @returns The sanitized room ID
 */
export function sanitizeRoomId(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  }).replace(/[^a-zA-Z0-9-_]/g, '').substring(0, 50);
}
