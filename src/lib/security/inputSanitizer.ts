import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('input-sanitizer');

export interface SanitizationOptions {
  maxLength?: number;
  allowHtml?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  removeNullBytes?: boolean;
  normalizeUnicode?: boolean;
}

const DEFAULT_OPTIONS: SanitizationOptions = {
  maxLength: 1000,
  allowHtml: false,
  trim: true,
  removeNullBytes: true,
  normalizeUnicode: true,
};

const XSS_PATTERNS = [
  /<script[^>]*>.*?<\/script>/gi,
  /<script[^>]*\/>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe[^>]*>.*?<\/iframe>/gi,
  /<object[^>]*>.*?<\/object>/gi,
  /<embed[^>]*>.*?<\/embed>/gi,
  /<form[^>]*>.*?<\/form>/gi,
  /data:text\/html/gi,
  /data:application\/xhtml/gi,
];

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE)\b)/gi,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(--|#|\/\*|\*\/)/g,
  /(\bWAITFOR\b\s+\bDELAY\b)/gi,
  /(\bBENCHMARK\b\s*\()/gi,
  /(\bSLEEP\b\s*\()/gi,
];

const NULL_BYTES_PATTERN = /\x00/g;

const CONTROL_CHARS_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

export function sanitizeString(input: string, options: SanitizationOptions = {}): string {
  if (typeof input !== 'string') {
    return '';
  }

  const opts = { ...DEFAULT_OPTIONS, ...options };
  let sanitized = input;

  if (opts.removeNullBytes) {
    sanitized = sanitized.replace(NULL_BYTES_PATTERN, '');
  }

  if (opts.normalizeUnicode) {
    sanitized = sanitized.normalize('NFC');
  }

  if (opts.trim) {
    sanitized = sanitized.trim();
  }

  if (!opts.allowHtml) {
    sanitized = sanitizeHtml(sanitized);
  }

  sanitized = sanitized.replace(CONTROL_CHARS_PATTERN, '');

  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
    logger.warn('Input truncated due to max length', { maxLength: opts.maxLength });
  }

  if (opts.lowercase) {
    sanitized = sanitized.toLowerCase();
  }

  if (opts.uppercase) {
    sanitized = sanitized.toUpperCase();
  }

  return sanitized;
}

export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  XSS_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizationOptions = {}
): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key, { ...options, allowHtml: false });

    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[sanitizedKey] = sanitizeString(value, options);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        (sanitized as Record<string, unknown>)[sanitizedKey] = sanitizeArray(value, options);
      } else {
        (sanitized as Record<string, unknown>)[sanitizedKey] = sanitizeObject(
          value as Record<string, unknown>,
          options
        );
      }
    } else {
      (sanitized as Record<string, unknown>)[sanitizedKey] = value;
    }
  }

  return sanitized;
}

export function sanitizeArray<T>(arr: T[], options: SanitizationOptions = {}): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr.map((item) => {
    if (typeof item === 'string') {
      return sanitizeString(item, options) as T;
    } else if (typeof item === 'object' && item !== null) {
      if (Array.isArray(item)) {
        return sanitizeArray(item, options) as T;
      } else {
        return sanitizeObject(item as Record<string, unknown>, options) as T;
      }
    }
    return item;
  });
}

export function detectXss(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

export function detectSqlInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

export function validateInput(
  input: string,
  options: {
    maxLength?: number;
    minLength?: number;
    pattern?: RegExp;
    blockXss?: boolean;
    blockSqlInjection?: boolean;
  } = {}
): { valid: boolean; error?: string; sanitized: string } {
  const { maxLength, minLength, pattern, blockXss = true, blockSqlInjection = true } = options;

  const sanitized = sanitizeString(input);

  if (minLength !== undefined && sanitized.length < minLength) {
    return {
      valid: false,
      error: `Input must be at least ${minLength} characters`,
      sanitized,
    };
  }

  if (maxLength !== undefined && sanitized.length > maxLength) {
    return {
      valid: false,
      error: `Input must be no more than ${maxLength} characters`,
      sanitized,
    };
  }

  if (pattern && !pattern.test(sanitized)) {
    return {
      valid: false,
      error: 'Input format is invalid',
      sanitized,
    };
  }

  if (blockXss && detectXss(input)) {
    logger.warn('Potential XSS attempt detected', { input: input.substring(0, 100) });
    return {
      valid: false,
      error: 'Input contains potentially dangerous content',
      sanitized,
    };
  }

  if (blockSqlInjection && detectSqlInjection(input)) {
    logger.warn('Potential SQL injection attempt detected', { input: input.substring(0, 100) });
    return {
      valid: false,
      error: 'Input contains potentially dangerous content',
      sanitized,
    };
  }

  return { valid: true, sanitized };
}

export function sanitizeSymbol(symbol: string): string {
  return sanitizeString(symbol, {
    maxLength: 20,
    allowHtml: false,
    trim: true,
    uppercase: true,
  }).replace(/[^A-Z0-9\/\-]/g, '');
}

export function sanitizeProvider(provider: string): string {
  const validProviders = [
    'chainlink',
    'band_protocol',
    'uma',
    'api3',
    'pyth',
    'redstone',
    'chronicle',
    'dia',
    'tellor',
    'winklink',
  ];

  const sanitized = sanitizeString(provider, {
    maxLength: 30,
    allowHtml: false,
    trim: true,
    lowercase: true,
  });

  return validProviders.includes(sanitized) ? sanitized : '';
}

export function sanitizeChain(chain: string): string {
  const validChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'bsc',
    'avalanche',
    'base',
    'fantom',
    'gnosis',
  ];

  const sanitized = sanitizeString(chain, {
    maxLength: 20,
    allowHtml: false,
    trim: true,
    lowercase: true,
  });

  return validChains.includes(sanitized) ? sanitized : '';
}

export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeString(email, {
    maxLength: 254,
    allowHtml: false,
    trim: true,
    lowercase: true,
  });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(sanitized) ? sanitized : '';
}

export function sanitizeUuid(uuid: string): string {
  const sanitized = sanitizeString(uuid, {
    maxLength: 36,
    allowHtml: false,
    trim: true,
  });

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(sanitized) ? sanitized : '';
}
