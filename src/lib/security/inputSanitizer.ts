import { createLogger } from '@/lib/utils/logger';
import { ORACLE_PROVIDER_VALUES, BLOCKCHAIN_VALUES } from '@/types/oracle/enums';
import type { OracleProvider } from '@/types/oracle/enums';

import type { DOMPurify as DOMPurifyType } from 'dompurify';

const logger = createLogger('input-sanitizer');

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

function sanitizeHtmlBasic(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  const DOMPurify = getDOMPurifySync();
  if (DOMPurify) {
    const cleaned = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
      ALLOW_DATA_ATTR: false,
      ADD_TAGS: [],
      ADD_ATTR: [],
    });
    return cleaned
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  return input
    .replace(/<\/?[^>]*(?:>|$)/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

interface SanitizationOptions {
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
    sanitized = sanitizeHtmlBasic(sanitized);
  }

  sanitized = sanitized.replace(CONTROL_CHARS_PATTERN, '');

  if (opts.maxLength && sanitized.length > opts.maxLength) {
    sanitized = sanitized.substring(0, opts.maxLength);
    logger.warn('Input truncated due to max length', { maxLength: opts.maxLength });
  }

  if (opts.lowercase && opts.uppercase) {
    logger.warn('Both lowercase and uppercase options set; using uppercase');
    sanitized = sanitized.toUpperCase();
  } else if (opts.lowercase) {
    sanitized = sanitized.toLowerCase();
  } else if (opts.uppercase) {
    sanitized = sanitized.toUpperCase();
  }

  return sanitized;
}

export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  options: SanitizationOptions = {}
): T {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const MAX_DEPTH = 10;
  const seen = new WeakSet();

  function sanitizeRecursive(value: unknown, depth: number): unknown {
    if (depth > MAX_DEPTH) return value;
    if (typeof value === 'string') return sanitizeString(value, options);
    if (typeof value !== 'object' || value === null) return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
      return value.map((item) => sanitizeRecursive(item, depth + 1));
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const sanitizedKey = sanitizeString(k, { ...options, allowHtml: false });
      result[sanitizedKey] = sanitizeRecursive(v, depth + 1);
    }
    return result;
  }

  return sanitizeRecursive(obj, 0) as T;
}

export function sanitizeSymbol(symbol: string): string {
  const sanitized = sanitizeString(symbol, {
    maxLength: 20,
    allowHtml: false,
    trim: true,
    uppercase: true,
  });

  return sanitized.replace(/[^A-Z0-9/\-]/g, '');
}

export function sanitizeUuid(uuid: string): string {
  const sanitized = sanitizeString(uuid, {
    maxLength: 36,
    allowHtml: false,
    trim: true,
  });

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(sanitized)) {
    return '';
  }
  return sanitized.toLowerCase();
}

export function sanitizeProvider(provider: string): string {
  const validProviders = ORACLE_PROVIDER_VALUES;

  const sanitized = sanitizeString(provider, {
    maxLength: 30,
    allowHtml: false,
    trim: true,
    lowercase: true,
  });

  if (!validProviders.includes(sanitized as OracleProvider)) {
    logger.warn('Invalid provider value rejected', { provider: provider.substring(0, 50) });
    throw new Error(`Invalid provider: ${provider.substring(0, 50)}`);
  }
  return sanitized;
}

export function sanitizeChain(chain: string): string {
  const validChains = BLOCKCHAIN_VALUES as readonly string[];

  const sanitized = sanitizeString(chain, {
    maxLength: 30,
    allowHtml: false,
    trim: true,
    lowercase: true,
  });

  if (!validChains.includes(sanitized)) {
    logger.warn('Invalid chain value rejected', { chain: chain.substring(0, 50) });
    throw new Error(`Invalid chain: ${chain.substring(0, 50)}`);
  }
  return sanitized;
}
