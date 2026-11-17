/**
 * Sanitizes URLs to prevent XSS via javascript:, data:, or vbscript: pseudo-protocols.
 * Allowed: http://, https://, mailto:, and relative paths starting with /
 * @param {string} url
 * @returns {string} Safe sanitized URL or '#' fallback
 */
export const sanitizeUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return '#';
  }

  // Strip non-printable and control characters
  const clean = url.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  // Block dangerous pseudo-protocols
  if (/^(javascript|data|vbscript):/i.test(clean)) {
    return '#';
  }

  // Allow standard web protocols and internal routes
  if (/^(https?:\/\/|mailto:|\/)/i.test(clean)) {
    return clean;
  }

  // If missing scheme, default to https://
  if (/^[\w.-]+\.[a-z]{2,}/i.test(clean)) {
    return `https://${clean}`;
  }

  return '#';
};

