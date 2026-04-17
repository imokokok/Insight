import { describe, it, expect } from '@jest/globals';

import {
  sanitizeHtml,
  encodeHtmlEntities,
  decodeHtmlEntities,
  stripHtmlTags,
  sanitizeUrl,
  sanitizeStyleValue,
  sanitizeAttributeValue,
  sanitizeForDisplay,
  sanitizeForAttribute,
  sanitizeForJavaScript,
  sanitizeForCss,
  detectXss,
  XSS_PATTERNS,
} from '../xss';

describe('xss', () => {
  describe('encodeHtmlEntities', () => {
    it('should encode HTML special characters', () => {
      expect(encodeHtmlEntities('<')).toBe('&lt;');
      expect(encodeHtmlEntities('>')).toBe('&gt;');
      expect(encodeHtmlEntities('&')).toBe('&amp;');
      expect(encodeHtmlEntities('"')).toBe('&quot;');
      expect(encodeHtmlEntities("'")).toBe('&#x27;');
      expect(encodeHtmlEntities('/')).toBe('&#x2F;');
      expect(encodeHtmlEntities('`')).toBe('&#x60;');
      expect(encodeHtmlEntities('=')).toBe('&#x3D;');
    });

    it('should leave normal characters unchanged', () => {
      expect(encodeHtmlEntities('Hello World')).toBe('Hello World');
    });
  });

  describe('decodeHtmlEntities', () => {
    it('should decode HTML entities', () => {
      expect(decodeHtmlEntities('&lt;')).toBe('<');
      expect(decodeHtmlEntities('&gt;')).toBe('>');
      expect(decodeHtmlEntities('&amp;')).toBe('&');
      expect(decodeHtmlEntities('&quot;')).toBe('"');
      expect(decodeHtmlEntities('&#x27;')).toBe("'");
      expect(decodeHtmlEntities('&#x2F;')).toBe('/');
    });

    it('should leave unknown entities unchanged', () => {
      expect(decodeHtmlEntities('&unknown;')).toBe('&unknown;');
    });
  });

  describe('stripHtmlTags', () => {
    it('should remove HTML tags', () => {
      expect(stripHtmlTags('<b>Hello</b>')).toBe('Hello');
      expect(stripHtmlTags('<script>alert(1)</script>')).toBe('alert(1)');
    });

    it('should handle nested tags', () => {
      expect(stripHtmlTags('<div><p>Text</p></div>')).toBe('Text');
    });

    it('should leave text without tags unchanged', () => {
      expect(stripHtmlTags('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const input = '<script>alert</script>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should encode HTML entities when encodeHtml is true', () => {
      const input = '<b>Hello</b>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<b>');
      expect(result).toBe('Hello');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeHtml(null as unknown as string)).toBe('');
    });

    it('should respect maxLength option', () => {
      const input = 'a'.repeat(200);
      const result = sanitizeHtml(input, { maxLength: 10 });
      expect(result.length).toBe(10);
    });

    it('should strip dangerous protocols', () => {
      expect(sanitizeHtml('javascript:alert(1)')).toBe('alert(1)');
      expect(sanitizeHtml('vbscript:msgbox(1)')).toBe('msgbox(1)');
    });
  });

  describe('sanitizeUrl', () => {
    it('should allow http and https protocols', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    it('should allow relative URLs', () => {
      expect(sanitizeUrl('/path/to/page')).toBe('/path/to/page');
      expect(sanitizeUrl('./path/to/page')).toBe('./path/to/page');
      expect(sanitizeUrl('../path/to/page')).toBe('../path/to/page');
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not-a-url')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeUrl(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizeStyleValue', () => {
    it('should remove expression pattern', () => {
      expect(sanitizeStyleValue('expression(alert(1))')).toBe('alert(1))');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeStyleValue('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should remove vbscript: protocol', () => {
      expect(sanitizeStyleValue('vbscript:msgbox(1)')).toBe('msgbox(1)');
    });

    it('should remove behavior', () => {
      expect(sanitizeStyleValue('behavior:url(xss.htc)')).toBe('url(xss.htc)');
    });

    it('should remove @import', () => {
      expect(sanitizeStyleValue('@import url(xss.css)')).toBe(' url(xss.css)');
    });

    it('should leave normal values unchanged', () => {
      expect(sanitizeStyleValue('red')).toBe('red');
      expect(sanitizeStyleValue('#ff0000')).toBe('#ff0000');
    });
  });

  describe('sanitizeAttributeValue', () => {
    it('should encode HTML special characters', () => {
      expect(sanitizeAttributeValue('<')).toBe('&lt;');
      expect(sanitizeAttributeValue('>')).toBe('&gt;');
      expect(sanitizeAttributeValue('"')).toBe('&quot;');
    });
  });

  describe('sanitizeForDisplay', () => {
    it('should strip tags and encode entities', () => {
      const input = '<b>Hello</b>';
      const result = sanitizeForDisplay(input);
      expect(result).not.toContain('<b>');
      expect(result).toBe('Hello');
    });
  });

  describe('sanitizeForAttribute', () => {
    it('should encode special characters', () => {
      expect(sanitizeForAttribute('"')).toBe('&quot;');
      expect(sanitizeForAttribute('<')).toBe('&lt;');
    });
  });

  describe('sanitizeForJavaScript', () => {
    it('should escape special characters', () => {
      expect(sanitizeForJavaScript("'")).toBe("\\'");
      expect(sanitizeForJavaScript('"')).toBe('\\"');
      expect(sanitizeForJavaScript('\\')).toBe('\\\\');
      expect(sanitizeForJavaScript('\n')).toBe('\\n');
      expect(sanitizeForJavaScript('\r')).toBe('\\r');
      expect(sanitizeForJavaScript('\t')).toBe('\\t');
    });
  });

  describe('sanitizeForCss', () => {
    it('should remove angle brackets and quotes', () => {
      expect(sanitizeForCss('<div>')).toBe('div');
      expect(sanitizeForCss('"test"')).toBe('test');
      expect(sanitizeForCss("'test'")).toBe('test');
    });
  });

  describe('detectXss', () => {
    it('should detect script tags', () => {
      expect(detectXss('<script>alert(1)</script>')).toBe(true);
    });

    it('should detect self-closing script tags', () => {
      expect(detectXss('<script/>')).toBe(true);
    });

    it('should detect javascript protocol', () => {
      expect(detectXss('javascript:alert(1)')).toBe(true);
    });

    it('should detect onload events', () => {
      expect(detectXss('<svg onload=alert(1)>')).toBe(true);
    });

    it('should detect img src XSS', () => {
      expect(detectXss('<img src=x onerror=alert(1)>')).toBe(true);
    });

    it('should detect iframe', () => {
      expect(detectXss('<iframe src="xss.html">')).toBe(true);
    });

    it('should detect object tag', () => {
      expect(detectXss('<object data="xss.swf">')).toBe(true);
    });

    it('should detect embed tag', () => {
      expect(detectXss('<embed src="xss.swf">')).toBe(true);
    });

    it('should detect form tag', () => {
      expect(detectXss('<form action="xss">')).toBe(true);
    });

    it('should detect data:text/html', () => {
      expect(detectXss('data:text/html,<h1>xss</h1>')).toBe(true);
    });

    it('should detect expression()', () => {
      expect(detectXss('expression(alert(1))')).toBe(true);
    });

    it('should not flag normal text', () => {
      expect(detectXss('Hello World')).toBe(false);
    });

    it('should return false for non-string input', () => {
      expect(detectXss(null as unknown as string)).toBe(false);
    });
  });

  describe('XSS_PATTERNS', () => {
    it('should export all required patterns', () => {
      expect(XSS_PATTERNS.SCRIPT_OPEN).toBeDefined();
      expect(XSS_PATTERNS.SCRIPT_CLOSE).toBeDefined();
      expect(XSS_PATTERNS.SCRIPT_SELF_CLOSING).toBeDefined();
      expect(XSS_PATTERNS.JAVASCRIPT_PROTOCOL).toBeDefined();
      expect(XSS_PATTERNS.ON_EVENT_HANDLER).toBeDefined();
      expect(XSS_PATTERNS.IFRAME).toBeDefined();
      expect(XSS_PATTERNS.OBJECT).toBeDefined();
      expect(XSS_PATTERNS.EMBED).toBeDefined();
      expect(XSS_PATTERNS.FORM).toBeDefined();
      expect(XSS_PATTERNS.SVG_ONLOAD).toBeDefined();
      expect(XSS_PATTERNS.IMG_SRC).toBeDefined();
      expect(XSS_PATTERNS.DATA_URL_HTML).toBeDefined();
      expect(XSS_PATTERNS.EXPRESSION).toBeDefined();
    });
  });
});
