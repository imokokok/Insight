# Testing Guide

> Testing strategy and practices for the Insight project

## Table of Contents

- [Testing Strategy](#testing-strategy)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [E2E Tests](#e2e-tests)
- [Best Practices](#best-practices)

## Testing Strategy

### Testing Pyramid

```
    /\
   /  \  E2E Tests (Few)
  /----\
 /      \  Integration Tests (Moderate)
/--------\
/          \  Unit Tests (Many)
------------
```

### Testing Layers

| Layer             | Ratio | Tools                        | Focus                        |
| ----------------- | ----- | ---------------------------- | ---------------------------- |
| Unit Tests        | 70%   | Jest + React Testing Library | Functions, Components, Hooks |
| Integration Tests | 20%   | Jest + MSW                   | API, Data Flow               |
| E2E Tests         | 10%   | Playwright                   | User Flows                   |

### Test Directory Structure

```
src/
├── lib/
│   └── oracles/
│       └── __tests__/
│           ├── base.test.ts
│           ├── factory.test.ts
│           └── chainlink.test.ts
├── hooks/
│   └── __tests__/
│       ├── usePriceData.test.ts
│       └── useOracleData.test.ts
├── components/
│   └── oracle/
│       └── __tests__/
│           ├── PriceCard.test.tsx
│           └── PriceChart.test.tsx
└── app/
    └── api/
        └── oracles/
            └── __tests__/
                └── route.test.ts
```

## Unit Tests

### Test Configuration

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/src/**/*.test.ts', '**/src/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.{ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Utility Function Tests

```typescript
// src/lib/utils/__tests__/formatPrice.test.ts
import { formatPrice, formatPercentage } from '../formatPrice';

describe('formatPrice', () => {
  it('should format price with default decimals', () => {
    expect(formatPrice(12345.6789)).toBe('$12,345.68');
  });

  it('should format price with custom decimals', () => {
    expect(formatPrice(12345.6789, 4)).toBe('$12,345.6789');
  });

  it('should handle zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('should handle negative values', () => {
    expect(formatPrice(-1234.56)).toBe('-$1,234.56');
  });

  it('should handle very large numbers', () => {
    expect(formatPrice(1234567890.12)).toBe('$1,234,567,890.12');
  });
});

describe('formatPercentage', () => {
  it('should format positive percentage', () => {
    expect(formatPercentage(5.5)).toBe('+5.50%');
  });

  it('should format negative percentage', () => {
    expect(formatPercentage(-3.2)).toBe('-3.20%');
  });

  it('should format zero percentage', () => {
    expect(formatPercentage(0)).toBe('0.00%');
  });
});
```

### Oracle Client Tests

```typescript
// src/lib/oracles/__tests__/chainlink.test.ts
import { ChainlinkClient } from '../chainlink';
import { OracleProvider, Blockchain } from '@/types/oracle';

describe('ChainlinkClient', () => {
  let client: ChainlinkClient;

  beforeEach(() => {
    client = new ChainlinkClient({
      useDatabase: false,
      fallbackToMock: true,
    });
  });

  describe('Basic Properties', () => {
    it('should have correct name', () => {
      expect(client.name).toBe(OracleProvider.CHAINLINK);
    });

    it('should support expected chains', () => {
      expect(client.supportedChains).toContain(Blockchain.ETHEREUM);
      expect(client.supportedChains).toContain(Blockchain.ARBITRUM);
      expect(client.supportedChains).toContain(Blockchain.POLYGON);
    });
  });

  describe('getPrice', () => {
    it('should fetch price for BTC', async () => {
      const price = await client.getPrice('BTC', Blockchain.ETHEREUM);

      expect(price).toMatchObject({
        symbol: 'BTC',
        provider: OracleProvider.CHAINLINK,
        chain: Blockchain.ETHEREUM,
      });
      expect(price.price).toBeGreaterThan(0);
      expect(price.timestamp).toBeGreaterThan(0);
      expect(price.confidence).toBeGreaterThan(0);
    });

    it('should fetch price for ETH', async () => {
      const price = await client.getPrice('ETH');

      expect(price.symbol).toBe('ETH');
      expect(price.price).toBeGreaterThan(0);
    });

    it('should use default chain when not specified', async () => {
      const price = await client.getPrice('BTC');

      expect(price.chain).toBe(Blockchain.ETHEREUM);
    });

    it('should include 24h change data', async () => {
      const price = await client.getPrice('BTC');

      expect(price.change24h).toBeDefined();
      expect(price.change24hPercent).toBeDefined();
    });
  });

  describe('getHistoricalPrices', () => {
    it('should fetch historical prices', async () => {
      const prices = await client.getHistoricalPrices('BTC', Blockchain.ETHEREUM, 24);

      expect(prices).toHaveLength(96); // 24 hours * 4 data points
      expect(prices[0].symbol).toBe('BTC');
    });

    it('should return prices in chronological order', async () => {
      const prices = await client.getHistoricalPrices('BTC', undefined, 24);

      for (let i = 1; i < prices.length; i++) {
        expect(prices[i].timestamp).toBeGreaterThan(prices[i - 1].timestamp);
      }
    });

    it('should handle different time periods', async () => {
      const prices7d = await client.getHistoricalPrices('BTC', undefined, 24 * 7);
      expect(prices7d.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported symbols gracefully', async () => {
      const price = await client.getPrice('UNKNOWN');

      expect(price).toBeDefined();
      expect(price.price).toBeGreaterThan(0);
    });
  });
});
```

### Hooks Tests

```typescript
// src/hooks/__tests__/usePriceData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePriceData } from '../usePriceData';
import { OracleProvider } from '@/types/oracle';

// Mock oracle factory
jest.mock('@/lib/oracles/factory', () => ({
  OracleClientFactory: {
    getClient: jest.fn(() => ({
      getPrice: jest.fn().mockResolvedValue({
        symbol: 'BTC',
        price: 50000,
        timestamp: Date.now(),
        provider: 'chainlink',
      }),
    })),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

describe('usePriceData', () => {
  it('should fetch price data successfully', async () => {
    const { result } = renderHook(
      () => usePriceData(OracleProvider.CHAINLINK, 'BTC'),
      { wrapper: createWrapper() }
    );

    // Initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.symbol).toBe('BTC');
    expect(result.current.data?.price).toBe(50000);
  });

  it('should handle error state', async () => {
    // Mock error
    jest.mocked(OracleClientFactory.getClient).mockImplementation(() => {
      throw new Error('Network error');
    });

    const { result } = renderHook(
      () => usePriceData(OracleProvider.CHAINLINK, 'INVALID'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
```

### Component Tests

```typescript
// src/components/oracle/__tests__/PriceCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceCard } from '../PriceCard';
import { OracleProvider } from '@/types/oracle';

describe('PriceCard', () => {
  const mockPrice = {
    symbol: 'BTC',
    price: 50000,
    change24h: 1200,
    change24hPercent: 2.5,
    timestamp: Date.now(),
    provider: OracleProvider.CHAINLINK,
  };

  it('renders price information correctly', () => {
    render(<PriceCard data={mockPrice} />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('+2.50%')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<PriceCard data={mockPrice} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledWith(mockPrice);
  });

  it('shows loading state', () => {
    render(<PriceCard data={null} isLoading />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('displays negative change in red', () => {
    const negativePrice = {
      ...mockPrice,
      change24h: -800,
      change24hPercent: -1.5,
    };

    render(<PriceCard data={negativePrice} />);

    const changeElement = screen.getByText('-1.50%');
    expect(changeElement).toHaveClass('text-red-600');
  });
});
```

## Integration Tests

### API Route Tests

```typescript
// src/app/api/oracles/__tests__/route.test.ts
import { createMocks } from 'node-mocks-http';
import { GET } from '../[provider]/route';

describe('/api/oracles/[provider]', () => {
  it('returns price data for valid provider and symbol', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/oracles/chainlink?symbol=BTC',
    });

    const response = await GET(req as any, {
      params: { provider: 'chainlink' },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.data).toHaveProperty('symbol', 'BTC');
    expect(data.data).toHaveProperty('price');
    expect(data.data).toHaveProperty('timestamp');
  });

  it('returns 400 for missing symbol', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/oracles/chainlink',
    });

    const response = await GET(req as any, {
      params: { provider: 'chainlink' },
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('MISSING_PARAMS');
  });

  it('returns 400 for invalid provider', async () => {
    const { req } = createMocks({
      method: 'GET',
      url: '/api/oracles/invalid?symbol=BTC',
    });

    const response = await GET(req as any, {
      params: { provider: 'invalid' },
    });

    expect(response.status).toBe(400);
  });
});
```

### MSW (Mock Service Worker)

```typescript
// src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/oracles/:provider', (req, res, ctx) => {
    const { provider } = req.params;
    const symbol = req.url.searchParams.get('symbol');

    return res(
      ctx.json({
        data: {
          provider,
          symbol,
          price: 50000,
          timestamp: Date.now(),
          confidence: 0.98,
        },
      })
    );
  }),

  rest.get('/api/alerts', (req, res, ctx) => {
    return res(
      ctx.json({
        data: [
          { id: '1', symbol: 'BTC', condition: 'above', target: 60000 },
          { id: '2', symbol: 'ETH', condition: 'below', target: 2000 },
        ],
      })
    );
  }),
];

// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// jest.setup.js
import { server } from './src/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## E2E Tests

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Cases

```typescript
// e2e/chainlink.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chainlink Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/chainlink');
  });

  test('should display page title', async ({ page }) => {
    await expect(page).toHaveTitle(/Chainlink/);
  });

  test('should display price data', async ({ page }) => {
    await expect(page.getByText('BTC')).toBeVisible();
    await expect(page.getByText(/\$[\d,]+\.\d{2}/)).toBeVisible();
  });

  test('should switch between assets', async ({ page }) => {
    await page.getByRole('button', { name: 'ETH' }).click();
    await expect(page.getByText('ETH')).toBeVisible();
  });

  test('should display chart', async ({ page }) => {
    await expect(page.locator('.recharts-wrapper')).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Mobile test
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();
  });
});

// e2e/cross-oracle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cross Oracle Comparison', () => {
  test('should compare multiple oracles', async ({ page }) => {
    await page.goto('/en/cross-oracle');

    // Select oracles
    await page.getByLabel('Chainlink').check();
    await page.getByLabel('Pyth').check();

    // Select asset
    await page.getByRole('button', { name: 'BTC' }).click();

    // Verify comparison table
    await expect(page.getByText('Chainlink')).toBeVisible();
    await expect(page.getByText('Pyth')).toBeVisible();
  });

  test('should export comparison data', async ({ page }) => {
    await page.goto('/en/cross-oracle');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Export' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/comparison.*\.csv/);
  });
});
```

## Best Practices

### 1. Test Naming

```typescript
// ✅ Descriptive test names
describe('usePriceData', () => {
  it('should fetch price data successfully', async () => {
    // ...
  });

  it('should handle network errors gracefully', async () => {
    // ...
  });

  it('should cache data and return stale data while revalidating', async () => {
    // ...
  });
});

// ❌ Avoid vague naming
it('works', () => {});
it('test 1', () => {});
```

### 2. Test Structure

```typescript
// ✅ AAA Pattern (Arrange, Act, Assert)
describe('PriceCard', () => {
  it('displays price correctly', () => {
    // Arrange
    const price = { symbol: 'BTC', price: 50000 };

    // Act
    render(<PriceCard data={price} />);

    // Assert
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
  });
});

// ✅ Use beforeEach to reduce repetition
describe('OracleClient', () => {
  let client: OracleClient;

  beforeEach(() => {
    client = new OracleClient();
  });

  it('test 1', () => {
    // Use client
  });

  it('test 2', () => {
    // Use client
  });
});
```

### 3. Test Data

```typescript
// ✅ Use factory functions to create test data
function createMockPrice(overrides?: Partial<PriceData>): PriceData {
  return {
    symbol: 'BTC',
    price: 50000,
    timestamp: Date.now(),
    provider: OracleProvider.CHAINLINK,
    ...overrides,
  };
}

// Usage
const price = createMockPrice({ symbol: 'ETH', price: 3000 });

// ✅ Avoid hardcoding
// ❌ Not recommended
expect(result).toBe(50000);

// ✅ Recommended
const expectedPrice = mockPrice.price;
expect(result).toBe(expectedPrice);
```

### 4. Async Tests

```typescript
// ✅ Use waitFor for async operations
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});

// ✅ Use findBy for async elements
const element = await screen.findByText('Loaded');

// ✅ Test loading state
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

### 5. Mock Strategy

```typescript
// ✅ Selective mocking
jest.mock('@/lib/oracles/factory', () => ({
  OracleClientFactory: {
    getClient: jest.fn(),
  },
}));

// ✅ Use spy instead of full mock
const spy = jest.spyOn(console, 'error').mockImplementation();

// Restore after test
spy.mockRestore();

// ✅ Mock specific parts of a module
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));
```

### 6. Coverage

```bash
# Run tests and generate coverage report
npm run test:coverage

# View coverage report
open coverage/lcov-report/index.html
```

Coverage Targets:

- Statement Coverage: ≥ 80%
- Branch Coverage: ≥ 80%
- Function Coverage: ≥ 80%
- Line Coverage: ≥ 80%

### 7. Test Utilities

```typescript
// Custom render function
// src/test-utils.tsx
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function render(ui: React.ReactElement, options = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    options
  );
}

// Export test utilities
export * from '@testing-library/react';
export { render };

// Usage
import { render, screen } from '@/test-utils';
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test -- PriceCard.test.tsx

# Run specific pattern
npm test -- --testNamePattern="should fetch"

# Watch mode
npm test -- --watch

# Generate coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- chainlink.spec.ts
```

## Debugging Tips

### Using debugger

```typescript
it('should debug', async () => {
  const result = await fetchData();
  debugger; // Will pause here
  expect(result).toBeDefined();
});
```

### Printing DOM

```typescript
import { screen } from '@testing-library/react';

// Print entire DOM
screen.debug();

// Print specific element
screen.debug(screen.getByText('BTC'));
```

### Test Logs

```typescript
// View console.log
const consoleSpy = jest.spyOn(console, 'log');

// Execute operation

expect(consoleSpy).toHaveBeenCalledWith('expected message');
```
