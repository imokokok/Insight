# 测试指南

> Insight 项目的测试策略与实践

## 目录

- [测试策略](#测试策略)
- [单元测试](#单元测试)
- [集成测试](#集成测试)
- [E2E 测试](#e2e-测试)
- [最佳实践](#最佳实践)

## 测试策略

### 测试金字塔

```
    /\
   /  \  E2E 测试 (少量)
  /----\
 /      \  集成测试 (中等)
/--------\
/          \  单元测试 (大量)
------------
```

### 测试分层

| 层级     | 比例 | 工具                         | 关注点            |
| -------- | ---- | ---------------------------- | ----------------- |
| 单元测试 | 70%  | Jest + React Testing Library | 函数、组件、Hooks |
| 集成测试 | 20%  | Jest + MSW                   | API、数据流       |
| E2E 测试 | 10%  | Playwright                   | 用户流程          |

### 测试目录结构

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

## 单元测试

### 测试配置

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/*.stories.{ts,tsx}'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### 工具函数测试

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

### 预言机客户端测试

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

  describe('基本属性', () => {
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

  describe('错误处理', () => {
    it('should handle unsupported symbols gracefully', async () => {
      const price = await client.getPrice('UNKNOWN');

      expect(price).toBeDefined();
      expect(price.price).toBeGreaterThan(0);
    });
  });
});
```

### Hooks 测试

```typescript
// src/hooks/__tests__/usePriceData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePriceData } from '../usePriceData';
import { OracleProvider } from '@/types/oracle';

// Mock 预言机工厂
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

    // 初始状态
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    // 等待数据加载
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.symbol).toBe('BTC');
    expect(result.current.data?.price).toBe(50000);
  });

  it('should handle error state', async () => {
    // Mock 错误
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

### 组件测试

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

## 集成测试

### API 路由测试

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

## E2E 测试

### Playwright 配置

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

### E2E 测试用例

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
    // 移动端测试
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();
  });
});

// e2e/cross-oracle.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Cross Oracle Comparison', () => {
  test('should compare multiple oracles', async ({ page }) => {
    await page.goto('/en/cross-oracle');

    // 选择预言机
    await page.getByLabel('Chainlink').check();
    await page.getByLabel('Pyth').check();

    // 选择资产
    await page.getByRole('button', { name: 'BTC' }).click();

    // 验证对比表格
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

## 最佳实践

### 1. 测试命名

```typescript
// ✅ 描述性的测试名称
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

// ❌ 避免模糊的命名
it('works', () => {});
it('test 1', () => {});
```

### 2. 测试结构

```typescript
// ✅ AAA 模式 (Arrange, Act, Assert)
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

// ✅ 使用 beforeEach 减少重复
describe('OracleClient', () => {
  let client: OracleClient;

  beforeEach(() => {
    client = new OracleClient();
  });

  it('test 1', () => {
    // 使用 client
  });

  it('test 2', () => {
    // 使用 client
  });
});
```

### 3. 测试数据

```typescript
// ✅ 使用工厂函数创建测试数据
function createMockPrice(overrides?: Partial<PriceData>): PriceData {
  return {
    symbol: 'BTC',
    price: 50000,
    timestamp: Date.now(),
    provider: OracleProvider.CHAINLINK,
    ...overrides,
  };
}

// 使用
const price = createMockPrice({ symbol: 'ETH', price: 3000 });

// ✅ 避免硬编码
// ❌ 不推荐
expect(result).toBe(50000);

// ✅ 推荐
const expectedPrice = mockPrice.price;
expect(result).toBe(expectedPrice);
```

### 4. 异步测试

```typescript
// ✅ 使用 waitFor 等待异步操作
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});

// ✅ 使用 findBy 查询异步元素
const element = await screen.findByText('Loaded');

// ✅ 测试 loading 状态
expect(screen.getByText('Loading...')).toBeInTheDocument();
```

### 5. Mock 策略

```typescript
// ✅ 选择性 Mock
jest.mock('@/lib/oracles/factory', () => ({
  OracleClientFactory: {
    getClient: jest.fn(),
  },
}));

// ✅ 使用 spy 而不是完全 Mock
const spy = jest.spyOn(console, 'error').mockImplementation();

// 测试后恢复
spy.mockRestore();

// ✅ Mock 模块的特定部分
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));
```

### 6. 覆盖率

```bash
# 运行测试并生成覆盖率报告
npm run test:coverage

# 查看覆盖率报告
open coverage/lcov-report/index.html
```

覆盖率目标：

- 语句覆盖率：≥ 80%
- 分支覆盖率：≥ 80%
- 函数覆盖率：≥ 80%
- 行覆盖率：≥ 80%

### 7. 测试工具

```typescript
// 自定义渲染函数
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

// 导出测试工具
export * from '@testing-library/react';
export { render };

// 使用
import { render, screen } from '@/test-utils';
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定文件
npm test -- PriceCard.test.tsx

# 运行特定模式
npm test -- --testNamePattern="should fetch"

# 监视模式
npm test -- --watch

# 生成覆盖率报告
npm run test:coverage

# 运行 E2E 测试
npm run test:e2e

# 运行特定 E2E 测试
npm run test:e2e -- chainlink.spec.ts
```

## 调试技巧

### 使用 debugger

```typescript
it('should debug', async () => {
  const result = await fetchData();
  debugger; // 会在这里暂停
  expect(result).toBeDefined();
});
```

### 打印 DOM

```typescript
import { screen } from '@testing-library/react';

// 打印整个 DOM
screen.debug();

// 打印特定元素
screen.debug(screen.getByText('BTC'));
```

### 测试日志

```typescript
// 查看 console.log
const consoleSpy = jest.spyOn(console, 'log');

// 执行操作

expect(consoleSpy).toHaveBeenCalledWith('expected message');
```
