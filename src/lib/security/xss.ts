import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('xss-protection');

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

const DANGEROUS_TAGS = [
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'link',
  'style',
  'meta',
  'base',
  'head',
  'body',
  'html',
  'applet',
  'frame',
  'frameset',
  'marquee',
  'xml',
  'xss',
];

const DANGEROUS_ATTRIBUTES = [
  'onabort',
  'onactivate',
  'onafterprint',
  'onafterupdate',
  'onbeforeactivate',
  'onbeforecopy',
  'onbeforecut',
  'onbeforedeactivate',
  'onbeforeeditfocus',
  'onbeforepaste',
  'onbeforeprint',
  'onbeforeunload',
  'onbeforeupdate',
  'onblur',
  'onbounce',
  'oncellchange',
  'onchange',
  'onclick',
  'oncontextmenu',
  'oncontrolselect',
  'oncopy',
  'oncut',
  'ondataavailable',
  'ondatasetchanged',
  'ondatasetcomplete',
  'ondblclick',
  'ondeactivate',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'onerror',
  'onerrorupdate',
  'onfilterchange',
  'onfinish',
  'onfocus',
  'onfocusin',
  'onfocusout',
  'onhashchange',
  'onhelp',
  'oninput',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onlayoutcomplete',
  'onload',
  'onlosecapture',
  'onmessage',
  'onmousedown',
  'onmouseenter',
  'onmouseleave',
  'onmousemove',
  'onmouseout',
  'onmouseover',
  'onmouseup',
  'onmousewheel',
  'onmove',
  'onmoveend',
  'onmovestart',
  'onoffline',
  'ononline',
  'onpagehide',
  'onpageshow',
  'onpaste',
  'onpopstate',
  'onpropertychange',
  'onreadystatechange',
  'onreset',
  'onresize',
  'onresizeend',
  'onresizestart',
  'onrowenter',
  'onrowexit',
  'onrowsdelete',
  'onrowsinserted',
  'onscroll',
  'onsearch',
  'onselect',
  'onselectionchange',
  'onselectstart',
  'onstart',
  'onstop',
  'onstorage',
  'onsubmit',
  'onunload',
  'style',
  'href',
  'src',
  'action',
  'formaction',
  'background',
  'poster',
  'xlink:href',
  'xmlns',
];

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
    /<script[^>]*>.*?<\/script>/i,
    /<script[^>]*\/>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /data:text\/html/i,
    /expression\s*\(/i,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

export function createXSSProtectionHeaders(): Record<string, string> {
  return {
    'Content-Security-Policy':
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
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

export function applyXSSProtectionHeaders(response: Response): Response {
  const headers = createXSSProtectionHeaders();
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
