import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder (needed for viem)
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill for Next.js Request/Response
class MockRequest {
  constructor(input, init) {
    this.url = typeof input === 'string' ? input : input.url;
    this.method = init?.method || 'GET';
    this.headers = new Map(Object.entries(init?.headers || {}));
    this.body = init?.body;
  }

  json() {
    return Promise.resolve(JSON.parse(this.body || '{}'));
  }

  text() {
    return Promise.resolve(this.body || '');
  }
}

class MockResponse {
  constructor(body, init) {
    this.body = body;
    this.status = init?.status || 200;
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init?.headers || {}));
  }

  json() {
    return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
  }

  text() {
    return Promise.resolve(typeof this.body === 'string' ? this.body : JSON.stringify(this.body));
  }
}

// Only define if not already defined (for Node.js environment)
if (typeof global.Request === 'undefined') {
  global.Request = MockRequest;
}

if (typeof global.Response === 'undefined') {
  global.Response = MockResponse;
}

// Mock NextRequest/NextResponse
jest.mock('next/server', () => ({
  NextRequest: class NextRequest extends MockRequest {
    constructor(input, init) {
      super(input, init);
      this.nextUrl = new URL(typeof input === 'string' ? input : input.url);
    }
  },
  NextResponse: {
    json: (body, init) => new MockResponse(JSON.stringify(body), init),
    redirect: (url) => new MockResponse(null, { status: 302, headers: { Location: url } }),
    next: () => new MockResponse(null, { status: 200 }),
  },
}));

// Mock @vercel/analytics
jest.mock('@vercel/analytics', () => ({
  Analytics: () => null,
  track: jest.fn(),
}));

// Mock @vercel/speed-insights
jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key) => key,
  useLocale: () => 'en',
  useMessages: () => ({}),
  useTimeZone: () => 'UTC',
  useNow: () => new Date(),
  useFormatter: () => ({
    dateTime: () => '',
    number: () => '',
    relativeTime: () => '',
    list: () => '',
  }),
}));

jest.mock('next-intl/server', () => ({
  getTranslations: () => Promise.resolve((key) => key),
  getLocale: () => Promise.resolve('en'),
  getMessages: () => Promise.resolve({}),
  getTimeZone: () => Promise.resolve('UTC'),
  getNow: () => Promise.resolve(new Date()),
  getFormatter: () =>
    Promise.resolve({
      dateTime: () => '',
      number: () => '',
      relativeTime: () => '',
      list: () => '',
    }),
}));

// Mock use-intl
jest.mock('use-intl', () => ({
  useIntl: () => ({
    formatMessage: ({ id }) => id,
    formatDate: () => '',
    formatNumber: () => '',
    formatTime: () => '',
    formatRelativeTime: () => '',
  }),
}));
