import { createLogger } from '@/lib/utils/logger';

import type { DOMPurify as DOMPurifyType } from 'dompurify';

const logger = createLogger('xss-protection');

let dompurifyInstance: DOMPurifyType | null = null;
let dompurifyInitAttempted = false;

function getDOMPurifySync(): DOMPurifyType | null {
  if (dompurifyInstance) return dompurifyInstance;
  if (dompurifyInitAttempted) return null;
  dompurifyInitAttempted = true;
  try {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const DOMPurify = require('dompurify');
      dompurifyInstance = DOMPurify;
      return dompurifyInstance;
    }
  } catch {
    logger.warn('DOMPurify not available, using fallback sanitizer');
  }
  return null;
}

export interface XSSProtectionOptions {
  stripTags?: boolean;
  encodeHtml?: boolean;
  allowedTags?: string[];
  allowedAttributes?: string[];
  allowedProtocols?: string[];
  maxLength?: number;
}

const DEFAULT_OPTIONS: XSSProtectionOptions = {
  stripTags: true,
  encodeHtml: true,
  allowedTags: [],
  allowedAttributes: [],
  allowedProtocols: ['http', 'https', 'mailto'],
  maxLength: 10000,
};

const DANGEROUS_PROTOCOLS = [
  'javascript:',
  'vbscript:',
  'data:text/html',
  'data:application/xhtml',
  'data:application/xml',
  'mocha:',
  'livescript:',
  'about:',
  'chrome:',
  'feed:',
  'file:',
  'view-source:',
];

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

export const XSS_PATTERNS = {
  SCRIPT_OPEN: /<script[^>]*>/i,
  SCRIPT_CLOSE: /<\/script>/i,
  SCRIPT_SELF_CLOSING: /<script[^>]*\/>/i,
  JAVASCRIPT_PROTOCOL: /javascript:/i,
  ON_EVENT_HANDLER: /on\w+\s*=/i,
  IFRAME: /<iframe/i,
  OBJECT: /<object/i,
  EMBED: /<embed/i,
  FORM: /<form/i,
  SVG_ONLOAD: /<svg[^>]*onload=/i,
  IMG_SRC: /<img[^>]*src=/i,
  DATA_URL_HTML: /data:text\/html/i,
  SVG_TAG: /<svg[^>]*>/i,
  MATH_TAG: /<math[^>]*>/i,
  STYLE_TAG: /<style[^>]*>/i,
  EXPRESSION: /expression\s*\(/i,
} as const;

export function encodeHtmlEntities(input: string): string {
  return input.replace(/[&<>"'`=\/]/g, (char) => HTML_ENTITY_MAP[char] || char);
}

export function decodeHtmlEntities(input: string): string {
  const reverseMap: Record<string, string> = {};
  for (const [key, value] of Object.entries(HTML_ENTITY_MAP)) {
    reverseMap[value] = key;
  }
  return input.replace(/&[a-zA-Z0-9#]+;/g, (entity) => reverseMap[entity] || entity);
}

export function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

export function sanitizeHtml(input: string, options: XSSProtectionOptions = {}): string {
  if (typeof input !== 'string') {
    return '';
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = input;

  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
    logger.warn('Input truncated due to max length', { maxLength: opts.maxLength });
  }

  if (opts.stripTags) {
    if (opts.allowedTags && opts.allowedTags.length > 0) {
      const allowedPattern = new RegExp(`<(?!/?(?:${opts.allowedTags.join('|')})\\b)[^>]*>`, 'gi');
      sanitized = sanitized.replace(allowedPattern, '');
    } else {
      const DOMPurify = getDOMPurifySync();
      if (DOMPurify) {
        sanitized = DOMPurify.sanitize(sanitized, {
          ALLOWED_TAGS: [],
          ALLOWED_ATTR: [],
          ALLOW_DATA_ATTR: false,
        });
      }
      sanitized = stripHtmlTags(sanitized);
    }
  }

  if (opts.encodeHtml) {
    sanitized = encodeHtmlEntities(sanitized);
  }

  sanitized = sanitized.replace(new RegExp(`(${DANGEROUS_PROTOCOLS.join('|')})`, 'gi'), '');

  return sanitized;
}

export function sanitizeAttributeValue(value: string): string {
  return encodeHtmlEntities(value);
}

export function sanitizeUrl(url: string, allowedProtocols: string[] = ['http', 'https']): string {
  if (typeof url !== 'string') {
    return '';
  }

  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol.replace(':', ''))) {
      logger.warn('URL with disallowed protocol detected', { url: url.substring(0, 100) });
      return '';
    }
    return url;
  } catch {
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }
    logger.warn('Invalid URL detected', { url: url.substring(0, 100) });
    return '';
  }
}

export function sanitizeStyleValue(value: string): string {
  const dangerousPatterns = [
    /expression\s*\(/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /behavior:/gi,
    /-moz-binding/gi,
    /@import/gi,
    /binding/gi,
  ];

  let sanitized = value;
  dangerousPatterns.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  return sanitized;
}

export function detectXss(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    XSS_PATTERNS.SCRIPT_OPEN,
    XSS_PATTERNS.SCRIPT_SELF_CLOSING,
    XSS_PATTERNS.JAVASCRIPT_PROTOCOL,
    XSS_PATTERNS.ON_EVENT_HANDLER,
    XSS_PATTERNS.IFRAME,
    XSS_PATTERNS.OBJECT,
    XSS_PATTERNS.EMBED,
    XSS_PATTERNS.FORM,
    XSS_PATTERNS.SVG_ONLOAD,
    XSS_PATTERNS.IMG_SRC,
    XSS_PATTERNS.DATA_URL_HTML,
    XSS_PATTERNS.EXPRESSION,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

export function createXSSProtectionHeaders(nonce?: string): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'self'; " +
      "script-src 'self'" +
      (nonce ? ` 'nonce-${nonce}'` : " 'unsafe-inline'") +
      '; ' +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self'; " +
      "connect-src 'self' https: wss:; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';",
    'X-XSS-Protection': '1; mode=block',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };
}

export function applyXSSProtectionHeaders(response: Response, nonce?: string): Response {
  const headers = createXSSProtectionHeaders(nonce);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function sanitizeForDisplay(input: string): string {
  return encodeHtmlEntities(stripHtmlTags(input));
}

export function sanitizeForAttribute(input: string): string {
  return encodeHtmlEntities(input).replace(/"/g, '&quot;');
}

export function sanitizeForJavaScript(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function sanitizeForCss(input: string): string {
  return input.replace(/[<>'"]/g, '');
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: XSSProtectionOptions = {}
): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeHtml(value, options);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        (sanitized as Record<string, unknown>)[key] = value.map((item) =>
          typeof item === 'string' ? sanitizeHtml(item, options) : item
        );
      } else {
        (sanitized as Record<string, unknown>)[key] = sanitizeObject(
          value as Record<string, unknown>,
          options
        );
      }
    } else {
      (sanitized as Record<string, unknown>)[key] = value;
    }
  }

  return sanitized;
}

export { detectXss as xssDetect };
