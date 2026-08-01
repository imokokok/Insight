import '@testing-library/jest-dom';

if (typeof Request === 'undefined') {
  globalThis.Request = class Request {
    url: string;
    method: string;
    headers: Headers;
    constructor(input: string | URL, init?: RequestInit) {
      this.url = input.toString();
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers as Record<string, string>);
    }
  } as unknown as typeof Request;
}

if (typeof Response === 'undefined') {
  globalThis.Response = class Response {
    status: number;
    statusText: string;
    headers: Headers;
    body: BodyInit | null;
    ok: boolean;
    constructor(body?: BodyInit | null, init?: ResponseInit) {
      this.body = body || null;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || '';
      this.headers = new Headers(init?.headers as Record<string, string>);
      this.ok = this.status >= 200 && this.status < 300;
    }
    json() {
      // Parse the body as JSON (spec behaviour). Previously this returned the
      // raw body, so callers passing a JSON string got a string back instead
      // of the parsed object. Object bodies are deep-cloned via stringify,
      // which preserves the prior observable result for that case.
      const body = typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
      return Promise.resolve(body ? JSON.parse(body) : null);
    }
    text() {
      return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
    }
    static json(data: unknown, init?: ResponseInit) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
    }
    static error() {
      return new Response(null, { status: 500, statusText: 'Internal Server Error' });
    }
    static redirect(url: string | URL, status = 302) {
      return new Response(null, { status, headers: { Location: url.toString() } });
    }
  } as unknown as typeof Response;
}

if (typeof Headers === 'undefined') {
  globalThis.Headers = class Headers {
    private _headers: Record<string, string> = {};
    constructor(init?: Record<string, string> | [string, string][] | Headers) {
      if (init) {
        if (Array.isArray(init)) {
          init.forEach(([key, value]) => {
            this._headers[key.toLowerCase()] = value;
          });
        } else if (init instanceof Headers) {
          init.forEach((value, key) => {
            this._headers[key.toLowerCase()] = value;
          });
        } else {
          Object.entries(init).forEach(([key, value]) => {
            this._headers[key.toLowerCase()] = value;
          });
        }
      }
    }
    get(name: string) {
      return this._headers[name.toLowerCase()] || null;
    }
    set(name: string, value: string) {
      this._headers[name.toLowerCase()] = value;
    }
    has(name: string) {
      return name.toLowerCase() in this._headers;
    }
    delete(name: string) {
      delete this._headers[name.toLowerCase()];
    }
    forEach(callback: (value: string, key: string) => void) {
      Object.entries(this._headers).forEach(([key, value]) => callback(value, key));
    }
  } as unknown as typeof Headers;
}

if (typeof crypto === 'undefined') {
  Object.defineProperty(globalThis, 'crypto', {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    value: require('crypto').webcrypto,
  });
}

if (typeof TextEncoder === 'undefined' || typeof TextDecoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const util = require('util');
  Object.defineProperty(globalThis, 'TextEncoder', {
    value: util.TextEncoder,
  });
  Object.defineProperty(globalThis, 'TextDecoder', {
    value: util.TextDecoder,
  });
}

if (typeof IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}
