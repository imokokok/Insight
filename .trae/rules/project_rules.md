# Insight 项目代码规范

> 本文档定义了 Insight 项目的代码规范，所有 AI 在编写代码前必须阅读并遵循此规范。

---

## 1. 技术栈与版本

### 1.1 核心技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js | 16.1.6 | React 框架，App Router |
| React | 19.2.3 | UI 库 |
| TypeScript | ^5 | 类型系统 |
| Tailwind CSS | ^4 | 样式框架 |
| next-intl | ^4.8.3 | 国际化 |
| shadcn/ui | - | UI 组件库 |

### 1.2 关键依赖

- **状态管理**: Zustand (^5.0.11)
- **数据获取**: TanStack Query (^5.90.21)
- **图表**: Recharts (^3.8.0)
- **动画**: Framer Motion (^12.36.0)
- **图标**: Lucide React (^0.577.0)
- **日期处理**: date-fns (^4.1.0)
- **数据库**: Supabase (^2.98.0)
- **监控**: Sentry (^10.43.0)

### 1.3 代码质量工具

- **Linting**: ESLint 9 + eslint-config-next
- **格式化**: Prettier 3
- **测试**: Jest 30 + Testing Library

---

## 2. 命名约定

### 2.1 接口 (Interfaces)

- 使用 **PascalCase**
- 名词形式，描述数据结构
- 避免使用 `I` 前缀

```typescript
// ✅ 正确
interface PriceData {
  symbol: string;
  price: number;
  timestamp: number;
}

interface OracleClientConfig {
  useDatabase?: boolean;
  fallbackToMock?: boolean;
}

// ❌ 错误
interface IPriceData { ... }
interface priceData { ... }
```

### 2.2 类型别名 (Type Aliases)

- 使用 **PascalCase**
- 用于联合类型、交叉类型、函数类型

```typescript
// ✅ 正确
type HistoryPeriod = 7 | 30 | 90;
type EventType = 'DELEGATION' | 'UNDELEGATION';
type FetchPriceFunction = (symbol: string) => Promise<PriceData>;
```

### 2.3 枚举 (Enums)

- 使用 **PascalCase** 命名枚举
- 枚举成员使用 **UPPER_SNAKE_CASE**

```typescript
// ✅ 正确
export enum EventType {
  DELEGATION = 'DELEGATION',
  UNDELEGATION = 'UNDELEGATION',
  COMMISSION_CHANGE = 'COMMISSION_CHANGE',
  JAILED = 'JAILED',
  UNJAILED = 'UNJAILED',
}

export enum OracleProvider {
  CHAINLINK = 'chainlink',
  PYTH = 'pyth',
  BAND_PROTOCOL = 'band_protocol',
}
```

### 2.4 类 (Classes)

- 使用 **PascalCase**
- 抽象类以 `Base` 或 `Abstract` 开头（可选）

```typescript
// ✅ 正确
export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  
  protected config: OracleClientConfig;
  
  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
  }
}

export class BandProtocolClient extends BaseOracleClient {
  name = OracleProvider.BAND_PROTOCOL;
  supportedChains = [Blockchain.ETHEREUM, ...];
}
```

### 2.5 函数

- 使用 **camelCase**
- 动词开头，描述行为
- 自定义 Hooks 以 `use` 开头

```typescript
// ✅ 正确
function calculateMovingAverage(prices: number[], period: number): number[] { ... }
function formatPrice(price: number, decimals: number): string { ... }

// Hooks
function usePriceData(client: BaseOracleClient, options: UsePriceDataOptions) { ... }
function useHistoricalPrices(client: BaseOracleClient, options: UseHistoricalPricesOptions) { ... }
```

### 2.6 变量

- 使用 **camelCase**
- 布尔变量使用 `is`、`has`、`should` 等前缀
- 常量使用 **UPPER_SNAKE_CASE**

```typescript
// ✅ 正确
const MAX_RETRY_COUNT = 3;
const DEFAULT_REFRESH_INTERVAL = 10000;

const price = 100.5;
const isLoading = true;
const hasError = false;
const shouldRefresh = false;
const validatorList: ValidatorInfo[] = [];
```

### 2.7 常量

- 文件顶部定义的常量使用 **UPPER_SNAKE_CASE**
- 组件内或函数内的常量使用 **camelCase**

```typescript
// ✅ 正确 - 文件级常量
const DEFAULT_CLIENT_CONFIG: OracleClientConfig = {
  useDatabase: true,
  fallbackToMock: true,
};

const CHAIN_VOLATILITY: Record<Blockchain, number> = {
  [Blockchain.ETHEREUM]: 0.02,
  [Blockchain.POLYGON]: 0.025,
};

// ✅ 正确 - 函数/组件内常量
function Component() {
  const maxDisplayCount = 10;
  const refreshInterval = 5000;
}
```

### 2.8 文件命名

| 类型 | 命名规范 | 示例 |
|------|----------|------|
| 组件 | PascalCase.tsx | `PriceChart.tsx`, `OracleCard.tsx` |
| Hooks | camelCase.ts | `usePriceData.ts`, `useOracleData.ts` |
| 工具函数 | camelCase.ts | `formatPrice.ts`, `calculateMetrics.ts` |
| 类型定义 | camelCase.ts | `oracle.ts`, `price.ts` |
| 常量 | camelCase.ts | `constants.ts`, `basePrices.ts` |
| 样式 | camelCase.css | `accessibility.css`, `globals.css` |
| 配置文件 | camelCase | `next.config.ts`, `eslint.config.mjs` |

---

## 3. 文件组织与目录结构

### 3.1 项目结构

```
/Users/imokokok/Documents/foresight-build/insight/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/           # 国际化路由
│   │   │   ├── page.tsx        # 页面组件
│   │   │   ├── layout.tsx      # 布局组件
│   │   │   ├── components/     # 页面级组件
│   │   │   └── hooks/          # 页面级 Hooks
│   │   └── api/                # API 路由
│   ├── components/             # 共享组件
│   │   ├── oracle/             # 预言机相关组件
│   │   │   ├── charts/         # 图表组件
│   │   │   ├── common/         # 通用组件
│   │   │   └── forms/          # 表单组件
│   │   ├── ui/                 # UI 基础组件
│   │   └── layout/             # 布局组件
│   ├── hooks/                  # 共享 Hooks
│   │   ├── queries/            # 数据查询 Hooks
│   │   └── realtime/           # 实时数据 Hooks
│   ├── lib/                    # 工具库
│   │   ├── oracles/            # 预言机客户端
│   │   ├── utils/              # 工具函数
│   │   └── config/             # 配置文件
│   ├── types/                  # 类型定义
│   │   ├── oracle/             # 预言机类型
│   │   ├── api/                # API 类型
│   │   └── ui/                 # UI 类型
│   ├── i18n/                   # 国际化配置
│   └── styles/                 # 全局样式
├── public/                     # 静态资源
├── scripts/                    # 脚本工具
└── .trae/rules/                # AI 规则文档
```

### 3.2 组件组织原则

- **页面组件**: 放在 `app/[locale]/*/page.tsx`
- **页面级组件**: 放在 `app/[locale]/*/components/`
- **共享组件**: 放在 `src/components/` 下按功能分类
- **组件索引**: 每个组件目录包含 `index.ts` 导出

```typescript
// src/components/oracle/charts/index.ts
export { PriceChart } from './PriceChart';
export { LatencyChart } from './LatencyChart';
export { VolatilityChart } from './VolatilityChart';
```

### 3.3 导入顺序

1. React/Next.js 内置
2. 第三方库
3. 项目内部绝对导入 (`@/*`)
4. 相对导入 (`./`, `../`)
5. 样式导入

```typescript
// ✅ 正确
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import { PriceData } from '@/types/oracle';
import { usePriceData } from '@/hooks/usePriceData';
import { formatPrice } from '@/lib/utils/format';

import { ChartHeader } from './ChartHeader';
import { useChartConfig } from '../hooks/useChartConfig';

import './styles.css';
```

---

## 4. TypeScript 类型定义

### 4.1 接口定义原则

- 优先使用 `interface` 而非 `type` 定义对象结构
- 使用 `type` 定义联合类型、交叉类型
- 为复杂类型提供 JSDoc 注释

```typescript
// ✅ 正确
/**
 * 价格数据接口
 * 包含代币价格、时间戳、置信度等信息
 */
interface PriceData {
  provider: OracleProvider;
  chain?: Blockchain;
  symbol: string;
  price: number;
  timestamp: number;
  decimals: number;
  confidence: number;
  change24h?: number;
  change24hPercent?: number;
}

// 联合类型使用 type
type PriceStatus = 'fresh' | 'stale' | 'error';
```

### 4.2 类型导出

- 在 `types/` 目录下按功能组织类型
- 每个目录包含 `index.ts` 统一导出
- 避免循环依赖

```typescript
// src/types/oracle/index.ts
export * from './enums';
export * from './price';
export * from './oracle';
export * from './config';
export * from './constants';
export * from './snapshot';
export * from './publisher';
export * from './snapshotFunctions';
```

### 4.3 Props 类型定义

- 组件 Props 使用 `interface` 定义
- 命名格式：`{ComponentName}Props`
- 可选属性使用 `?` 标记

```typescript
// ✅ 正确
interface PriceDisplayProps {
  price: number;
  symbol: string;
  className?: string;
  showChange?: boolean;
  onClick?: (price: number) => void;
}

export function PriceDisplay({
  price,
  symbol,
  className,
  showChange = true,
  onClick,
}: PriceDisplayProps) {
  // ...
}
```

---

## 5. React 组件规范

### 5.1 函数组件

- 使用函数声明而非箭头函数（默认导出除外）
- 组件名使用 PascalCase
- 一个文件默认导出一个主要组件

```typescript
// ✅ 正确
export function PriceChart({ data }: PriceChartProps) {
  return <div>...</div>;
}

// 默认导出使用箭头函数
export default function HomePage() {
  return <div>...</div>;
}

// ❌ 错误
export const PriceChart = ({ data }: PriceChartProps) => {
  return <div>...</div>;
};
```

### 5.2 客户端组件标记

- 使用 `'use client'` 指令标记客户端组件
- 仅在需要浏览器 API 或 React Hooks 时使用
- 尽量保持服务端组件默认行为

```typescript
// ✅ 正确
'use client';

import { useState } from 'react';

export function InteractiveChart() {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  // ...
}

// 服务端组件（默认）- 不需要 'use client'
export function StaticHeader({ title }: { title: string }) {
  return <header>{title}</header>;
}
```

### 5.3 Props 解构

- 在参数中直接解构 Props
- 提供有意义的默认值

```typescript
// ✅ 正确
interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outlined' | 'filled';
}

export function Card({
  title,
  children,
  className = '',
  variant = 'default',
}: CardProps) {
  return (
    <div className={`card card-${variant} ${className}`}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
```

### 5.4 条件渲染

- 使用逻辑与运算符进行简单条件渲染
- 复杂条件使用三元运算符或提前返回

```typescript
// ✅ 正确 - 简单条件
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage message={error.message} />}

// ✅ 正确 - 复杂条件
{data ? (
  <Chart data={data} />
) : (
  <EmptyState />
)}

// ✅ 正确 - 提前返回
export function DataDisplay({ data }: { data: Data | null }) {
  if (!data) {
    return <EmptyState />;
  }
  
  return <div>...</div>;
}
```

---

## 6. 自定义 Hooks 规范

### 6.1 Hook 命名

- 必须以 `use` 开头
- 使用 camelCase
- 描述 Hook 的功能

```typescript
// ✅ 正确
function usePriceData(client: BaseOracleClient, options: UsePriceDataOptions) { ... }
function useHistoricalPrices(client: BaseOracleClient, options: UseHistoricalPricesOptions) { ... }
function useRealtimeAlerts(options: UseRealtimeAlertsOptions) { ... }
```

### 6.2 Hook 返回值

- 返回对象形式，便于解构
- 包含标准状态：`data`/`value`, `isLoading`, `error`
- 提供 `refetch` 或类似方法

```typescript
// ✅ 正确
interface UsePriceDataReturn {
  price: PriceData | null;
  previousPrice: number | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

export function usePriceData(
  client: BaseOracleClient,
  options: UsePriceDataOptions
): UsePriceDataReturn {
  const [price, setPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const refetch = useCallback(async () => {
    // ...
  }, [client, options]);
  
  return {
    price,
    previousPrice,
    isLoading,
    error,
    lastUpdated,
    refetch,
  };
}
```

### 6.3 Hook 中的副作用

- 使用 `useEffect` 处理副作用
- 正确处理清理函数
- 使用 `AbortController` 取消异步操作

```typescript
// ✅ 正确
export function usePriceData(client: BaseOracleClient, options: UsePriceDataOptions) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  const fetchPrice = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    try {
      const priceData = await client.getPrice(symbol, chain);
      
      if (abortController.signal.aborted || !isMountedRef.current) return;
      
      setPrice(priceData);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!isMountedRef.current) return;
      setError(err instanceof Error ? err : new Error('Failed to fetch price'));
    }
  }, [client, symbol, chain]);
  
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  
  useEffect(() => {
    fetchPrice();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchPrice]);
}
```

---

## 7. 错误处理规范

### 7.1 错误类型

- 使用自定义错误类
- 提供错误码和上下文信息

```typescript
// src/lib/errors.ts
export class PriceFetchError extends Error {
  constructor(
    message: string,
    public context: {
      provider: OracleProvider;
      symbol: string;
      chain?: Blockchain;
      retryable: boolean;
    },
    public code?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'PriceFetchError';
  }
}

export class OracleClientError extends Error {
  constructor(message: string, public provider: OracleProvider) {
    super(message);
    this.name = 'OracleClientError';
  }
}
```

### 7.2 错误处理模式

- 使用 try-catch 包裹异步操作
- 区分可重试错误和不可重试错误
- 提供有意义的错误消息

```typescript
// ✅ 正确
async function fetchPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
  try {
    const priceData = await api.getPrice(symbol, chain);
    return priceData;
  } catch (error) {
    if (error instanceof PriceFetchError || error instanceof OracleClientError) {
      throw error;
    }
    
    throw new PriceFetchError(
      `Failed to fetch price for ${symbol}`,
      {
        provider: this.name,
        symbol,
        chain,
        retryable: true,
      },
      'FETCH_ERROR',
      error instanceof Error ? error : undefined
    );
  }
}
```

### 7.3 错误边界

- 使用 React Error Boundaries 捕获组件错误
- 提供降级 UI

```typescript
// ✅ 正确
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }
    
    return this.props.children;
  }
}
```

---

## 8. 性能优化规范

### 8.1 懒加载 (Lazy Loading)

- 使用 `next/dynamic` 进行组件懒加载
- 为非关键内容提供骨架屏

```typescript
// ✅ 正确
import dynamic from 'next/dynamic';
import { HeroSkeleton, ChartSkeleton } from '@/components/ui/ChartSkeleton';

const ProfessionalHero = dynamic(() => import('./home-components/ProfessionalHero'), {
  loading: () => <HeroSkeleton />,
  ssr: true,
});

const LivePriceTicker = dynamic(() => import('./home-components/LivePriceTicker'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### 8.2 Memoization

- 使用 `useMemo` 缓存计算结果
- 使用 `useCallback` 缓存回调函数
- 使用 `React.memo` 缓存组件（仅在必要时）

```typescript
// ✅ 正确
import { useMemo, useCallback, memo } from 'react';

function PriceList({ prices, onSelect }: PriceListProps) {
  // 缓存排序后的价格列表
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => b.price - a.price);
  }, [prices]);
  
  // 缓存回调函数
  const handleSelect = useCallback((price: PriceData) => {
    onSelect(price);
  }, [onSelect]);
  
  return (
    <ul>
      {sortedPrices.map(price => (
        <PriceItem key={price.symbol} price={price} onClick={handleSelect} />
      ))}
    </ul>
  );
}

// 仅在必要时使用 React.memo
export const PriceItem = memo(function PriceItem({ price, onClick }: PriceItemProps) {
  return <li onClick={() => onClick(price)}>{price.symbol}</li>;
});
```

### 8.3 虚拟化

- 长列表使用 `@tanstack/react-virtual` 进行虚拟化

```typescript
// ✅ 正确
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualPriceList({ prices }: { prices: PriceData[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: prices.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {prices[virtualItem.index].symbol}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 8.4 图片优化

- 使用 Next.js Image 组件
- 提供适当的尺寸和格式

```typescript
// ✅ 正确
import Image from 'next/image';

export function OracleLogo({ name }: { name: string }) {
  return (
    <Image
      src={`/logos/oracles/${name}.svg`}
      alt={`${name} logo`}
      width={32}
      height={32}
      priority={name === 'chainlink'}
    />
  );
}
```

---

## 9. shadcn/ui 组件规范

### 9.1 组件安装

- 使用官方 CLI 安装 shadcn/ui 组件
- 组件安装在 `src/components/ui/` 目录

```bash
# 安装 shadcn/ui 组件
npx shadcn add button
npx shadcn add card
npx shadcn add dialog
```

### 9.2 组件使用原则

- 优先使用 shadcn/ui 组件作为基础 UI 元素
- 自定义组件基于 shadcn/ui 组件扩展
- 保持 shadcn/ui 组件的原始结构，通过 className 覆盖样式

```typescript
// ✅ 正确 - 基于 shadcn/ui 组件扩展
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CustomCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function CustomCard({ title, children, className }: CustomCardProps) {
  return (
    <ShadcnCard className={cn('border-finance-primary', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </ShadcnCard>
  );
}
```

### 9.3 类名合并工具

项目使用 `cn` 工具函数合并 Tailwind 类名：

```typescript
import { cn } from '@/lib/utils';

// ✅ 正确
<button className={cn(
  'base-classes',
  variant === 'primary' && 'primary-classes',
  isDisabled && 'disabled-classes',
  className
)}>
```

---

## 10. Tailwind CSS 和样式规范

> **注意**: 项目使用 Tailwind CSS v4，语法与 v3 有所不同。v4 使用 `@import 'tailwindcss'` 和 `@theme` 指令。

### 10.1 Tailwind v4 配置

项目使用 CSS 优先的配置方式（Tailwind v4 新特性）：

```css
/* globals.css */
@import 'tailwindcss';

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  
  /* 自定义颜色 */
  --color-finance-primary: var(--finance-primary);
  --color-finance-secondary: var(--finance-secondary);
  --color-finance-accent: var(--finance-accent);
}
```

### 10.2 Tailwind 类名顺序

使用以下顺序组织 Tailwind 类名：

1. 布局 (display, position, flex, grid)
2. 尺寸 (width, height, padding, margin)
3. 背景 (background-color, background-image)
4. 边框 (border, border-radius)
5. 文字 (font-size, font-weight, color)
6. 效果 (shadow, opacity, transition)
7. 响应式前缀 (sm:, md:, lg:)
8. 状态前缀 (hover:, focus:, disabled:)

```typescript
// ✅ 正确
<div className="
  flex items-center justify-between
  w-full h-12 px-4
  bg-white dark:bg-gray-900
  border border-gray-200 rounded-lg
  text-sm font-medium text-gray-700
  shadow-sm hover:shadow-md
  transition-shadow duration-200
  md:h-14 md:px-6
  disabled:opacity-50
">
```

### 10.3 类名合并

- 使用 `clsx` 和 `tailwind-merge` 合并类名
- 项目已提供 `cn` 工具函数在 `src/lib/utils.ts`

```typescript
// ✅ 正确 - 使用项目提供的 cn 函数
import { cn } from '@/lib/utils';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-medium',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2 text-base',
        size === 'lg' && 'px-6 py-3 text-lg',
        className
      )}
    >
      {children}
    </button>
  );
}
```

### 10.4 Dune Style 设计系统

项目采用 **Dune Style** 扁平化设计语言：

#### 设计原则
- **无圆角设计**: 所有组件使用直角（`border-radius: 0`）
- **无阴影设计**: 扁平化风格，不使用阴影效果
- **边框分隔**: 使用细边框进行内容分隔
- **金融主题色**: 专业的金融配色方案

#### CSS 变量

```css
/* globals.css */
:root {
  --background: #fafafa;
  --foreground: #171717;
  
  /* Dune Style - Flat Design */
  --bg-dune: #fafafa;
  --border-dune-separator: #e5e7eb;
  
  /* Primary Brand Colors */
  --finance-primary: #1e40af;
  --finance-secondary: #3b82f6;
  --finance-accent: #60a5fa;
  
  /* Status Colors */
  --finance-success: #10b981;
  --finance-success-light: #d1fae5;
  --finance-warning: #f59e0b;
  --finance-warning-light: #fef3c7;
  --finance-danger: #ef4444;
  --finance-danger-light: #fee2e2;
  --finance-neutral: #64748b;
  --finance-neutral-light: #f1f5f9;
  
  /* Gradients */
  --finance-gradient-blue: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
  --finance-gradient-green: linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%);
  
  /* Border Radius - 扁平化设计 */
  --radius-sm: 0;
  --radius-md: 0;
  --radius-lg: 0;
  --radius-xl: 0;
}
```

#### 使用示例

```typescript
// ✅ 正确 - Dune Style 卡片
<div className="bg-white border border-[var(--border-dune-separator)]">
  <div className="border-b border-[var(--border-dune-separator)] p-4">
    <h3 className="text-[var(--finance-primary)] font-medium">标题</h3>
  </div>
  <div className="p-4">
    内容区域
  </div>
</div>

// ✅ 正确 - 状态颜色
<span className="text-[var(--finance-success)]">上涨</span>
<span className="text-[var(--finance-danger)]">下跌</span>
<span className="text-[var(--finance-warning)]">警告</span>
```

#### 预定义工具类

项目提供了以下 Dune Style 工具类：

```css
/* 卡片样式 */
.card           /* 基础卡片：白色背景 + 边框 */
.card-hover     /* 可悬停卡片 */

/* Dune 背景 */
.bg-dune
.border-dune-separator

/* 统计网格 */
.stat-grid      /* 无边框网格布局 */

/* 动画 */
.animate-fade-in
.animate-fade-in-up
.animate-slide-in-left
.animate-pulse-finance
```

### 10.5 响应式设计

- 使用移动优先的响应式设计
- 默认样式针对移动端，使用 `md:`, `lg:` 适配大屏

```typescript
// ✅ 正确
<div className="
  grid grid-cols-1 gap-4
  md:grid-cols-2 md:gap-6
  lg:grid-cols-3 lg:gap-8
">
```

---

## 11. i18n 国际化规范

### 11.1 翻译键命名

- 使用小写字母和连字符
- 按功能模块组织
- 使用嵌套结构

```json
{
  "oracle": {
    "title": "Oracle Comparison",
    "description": "Compare prices from multiple oracle providers",
    "filters": {
      "chain": "Select Chain",
      "symbol": "Select Symbol",
      "timeRange": "Time Range"
    }
  },
  "price": {
    "current": "Current Price",
    "change24h": "24h Change",
    "high24h": "24h High",
    "low24h": "24h Low"
  }
}
```

### 11.2 翻译键使用

- 使用 `useTranslations` Hook
- 避免在翻译键中硬编码动态值

```typescript
// ✅ 正确
import { useTranslations } from 'next-intl';

export function PriceCard({ symbol, price }: PriceCardProps) {
  const t = useTranslations('price');
  
  return (
    <div>
      <h3>{t('current')}</h3>
      <p>{t('symbol', { symbol })}: {price}</p>
    </div>
  );
}

// ❌ 错误
<h3>{t(`price.${symbol}`)}</h3>
```

### 11.3 翻译文件组织

项目使用分模块的翻译文件组织方式：

```
src/i18n/
├── request.ts              # i18n 配置，动态加载翻译文件
├── routing.ts              # 路由配置
└── messages/
    ├── en/                 # 英文翻译
    │   ├── common.json     # 通用翻译
    │   ├── navigation.json # 导航翻译
    │   ├── home.json       # 首页翻译
    │   ├── ui.json         # UI 组件翻译
    │   ├── marketOverview.json
    │   ├── priceQuery.json
    │   ├── comparison.json
    │   ├── crossOracle.json
    │   ├── crossChain.json
    │   ├── dataQuality.json
    │   ├── dataTransparency.json
    │   ├── oracles/        # 预言机页面翻译
    │   │   ├── chainlink.json
    │   │   ├── pyth.json
    │   │   ├── api3.json
    │   │   ├── band.json
    │   │   ├── tellor.json
    │   │   ├── uma.json
    │   │   ├── dia.json
    │   │   ├── redstone.json
    │   │   ├── chronicle.json
    │   │   └── winklink.json
    │   ├── components/     # 组件翻译
    │   │   ├── charts.json
    │   │   ├── alerts.json
    │   │   ├── favorites.json
    │   │   ├── search.json
    │   │   └── export.json
    │   └── features/       # 功能模块翻译
    │       ├── settings.json
    │       ├── auth.json
    │       └── methodology.json
    └── zh/                 # 中文翻译（结构同上）
```

---

## 12. API 路由和 Server Actions 规范

### 12.1 API 路由结构

```
app/api/
├── oracles/
│   └── [provider]/
│       └── route.ts
├── favorites/
│   ├── route.ts
│   └── [id]/
│       └── route.ts
└── health/
    └── route.ts
```

### 12.2 API 路由实现

- 使用标准 HTTP 方法
- 返回统一的响应格式
- 正确处理错误
- **注意**: Next.js 15 中 `params` 是异步的，需要 `await`

```typescript
// ✅ 正确
// app/api/oracles/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    // Next.js 15: params 是异步的，需要 await
    const { provider } = await params;
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol is required' },
        { status: 400 }
      );
    }
    
    const price = await fetchPrice(provider, symbol);
    
    return NextResponse.json({
      success: true,
      data: price,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('API Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
```

#### Next.js 15 异步参数说明

在 Next.js 15 中，动态路由参数变为异步：

```typescript
// ✅ 正确 - Next.js 15
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;  // 需要 await
  // ...
}

// ❌ 错误 - 这是 Next.js 14 的写法
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;  // 不需要 await
  // ...
}
```

### 12.3 请求验证

- 使用 Zod 或类似库验证请求参数
- 提供清晰的验证错误信息

```typescript
// ✅ 正确
import { z } from 'zod';

const PriceQuerySchema = z.object({
  symbol: z.string().min(1).max(20),
  chain: z.string().optional(),
  period: z.coerce.number().min(1).max(365).optional(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const result = PriceQuerySchema.safeParse({
    symbol: searchParams.get('symbol'),
    chain: searchParams.get('chain'),
    period: searchParams.get('period'),
  });
  
  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid parameters',
        details: result.error.errors,
      },
      { status: 400 }
    );
  }
  
  const { symbol, chain, period } = result.data;
  // ...
}
```

---

## 13. 测试规范

### 13.1 测试文件位置

- 测试文件与源文件同目录，或放在 `__tests__/` 目录
- 命名格式：`{filename}.test.ts` 或 `{filename}.spec.ts`

```
src/
├── hooks/
│   ├── usePriceData.ts
│   └── __tests__/
│       └── usePriceData.test.ts
├── lib/
│   └── utils/
│       ├── formatPrice.ts
│       └── formatPrice.test.ts
```

### 13.2 测试命名

- 描述被测试的功能
- 使用 `should` 开头

```typescript
// ✅ 正确
describe('usePriceData', () => {
  it('should return initial loading state', () => {
    // ...
  });
  
  it('should fetch price successfully', async () => {
    // ...
  });
  
  it('should handle fetch errors', async () => {
    // ...
  });
});
```

### 13.3 测试最佳实践

- 使用 `@testing-library/react` 测试组件
- 使用 `jest` 和 `@testing-library/jest-dom` 进行断言
- 模拟外部依赖

```typescript
// ✅ 正确
import { renderHook, waitFor } from '@testing-library/react';
import { usePriceData } from './usePriceData';

jest.mock('@/lib/oracles/base', () => ({
  BaseOracleClient: jest.fn().mockImplementation(() => ({
    getPrice: jest.fn().mockResolvedValue({
      symbol: 'ETH',
      price: 3500,
      timestamp: Date.now(),
    }),
  })),
}));

describe('usePriceData', () => {
  it('should fetch price successfully', async () => {
    const { result } = renderHook(() =>
      usePriceData(mockClient, { symbol: 'ETH' })
    );
    
    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.price).toEqual({
      symbol: 'ETH',
      price: 3500,
      timestamp: expect.any(Number),
    });
  });
});
```

---

## 14. 导入/导出规范

### 14.1 默认导出 vs 命名导出

- 优先使用 **命名导出**
- 页面组件可以使用默认导出
- 工具函数使用命名导出

```typescript
// ✅ 正确 - 命名导出
export function formatPrice(price: number): string { ... }
export function calculateAverage(values: number[]): number { ... }

// ✅ 正确 - 页面默认导出
export default function HomePage() { ... }

// ❌ 错误 - 不必要的默认导出
export default function formatPrice(price: number): string { ... }
```

### 14.2 索引文件 (Barrel Exports)

- 在目录中使用 `index.ts` 集中导出
- 按功能分组导出

```typescript
// src/components/oracle/index.ts
// 图表组件
export { PriceChart } from './charts/PriceChart';
export { LatencyChart } from './charts/LatencyChart';

// 通用组件
export { OracleCard } from './common/OracleCard';
export { PriceDisplay } from './common/PriceDisplay';

// 表单组件
export { FilterForm } from './forms/FilterForm';
```

### 14.3 路径别名

- 使用 `@/` 前缀引用项目内部模块
- 避免使用相对路径 `../../`

```typescript
// ✅ 正确
import { PriceData } from '@/types/oracle';
import { usePriceData } from '@/hooks/usePriceData';
import { formatPrice } from '@/lib/utils/format';

// ❌ 错误
import { PriceData } from '../../../types/oracle';
```

---

## 15. 注释和文档规范

### 15.1 JSDoc 注释

- 为公共 API 提供 JSDoc 注释
- 描述参数、返回值和可能的异常

```typescript
// ✅ 正确
/**
 * 获取指定代币的当前价格
 * @param symbol - 代币符号，如 'ETH', 'BTC'
 * @param chain - 可选的区块链类型
 * @returns 包含价格信息的数据对象
 * @throws {PriceFetchError} 当获取价格失败时抛出
 * @example
 * const price = await client.getPrice('ETH', Blockchain.ETHEREUM);
 * console.log(price.price); // 3500.00
 */
async function getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
  // ...
}
```

### 15.2 行内注释

- 解释 "为什么" 而非 "是什么"
- 避免显而易见的注释

```typescript
// ✅ 正确 - 解释业务逻辑
// 使用随机游走模型模拟价格波动，添加趋势组件使数据更真实
const randomWalk = (Math.random() - 0.5) * 2 * volatility;
const trendComponent = trendStrength * (1 + Math.sin((i / dataPoints) * Math.PI) * 0.5);

// ❌ 错误 - 显而易见的注释
// 设置价格为 100
const price = 100;
```

### 15.3 TODO 注释

- 使用 `TODO:` 标记待办事项
- 包含作者和日期（可选）

```typescript
// TODO: 添加缓存机制以提高性能
// TODO(imokokok): 2024-03-20 优化大数据集的渲染性能
```

---

## 16. 代码审查清单

在提交代码前，请检查以下项目：

### 16.1 类型安全

- [ ] 所有函数参数都有类型注解
- [ ] 所有函数返回值都有类型注解
- [ ] 没有使用 `any` 类型（除非必要且有注释）
- [ ] Props 接口定义完整

### 16.2 代码风格

- [ ] 遵循 Prettier 格式化规则
- [ ] ESLint 无错误和警告
- [ ] 命名符合规范（PascalCase, camelCase, UPPER_SNAKE_CASE）
- [ ] 导入顺序正确
- [ ] 遵循 Dune Style 设计系统（无圆角、无阴影）

### 16.3 React 最佳实践

- [ ] 正确使用 `'use client'` 指令
- [ ] Hooks 使用规范（以 `use` 开头，在顶层调用）
- [ ] 正确处理副作用清理
- [ ] 避免不必要的重渲染

### 16.4 性能

- [ ] 大列表使用虚拟化
- [ ] 非关键组件使用懒加载
- [ ] 图片使用 Next.js Image 组件
- [ ] 适当使用 memoization

### 16.5 错误处理

- [ ] 异步操作有 try-catch
- [ ] 错误信息有意义
- [ ] 提供降级 UI

### 16.6 可访问性

- [ ] 图片有 alt 属性
- [ ] 表单元素有 label
- [ ] 颜色对比度符合 WCAG 标准
- [ ] 支持键盘导航

### 16.7 国际化

- [ ] 用户可见文本使用翻译键
- [ ] 日期和数字格式化符合本地化要求

---

## 16. 常用命令

```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 构建生产版本
npm run start            # 启动生产服务器

# 代码质量
npm run lint             # 运行 ESLint
npx prettier --write .   # 格式化代码

# 测试
npm run test             # 运行测试
npm run test:watch       # 监听模式运行测试
npm run test:coverage    # 生成测试覆盖率报告

# 国际化
npm run i18n:types       # 生成 i18n 类型
npm run i18n:check       # 检查翻译完整性

# 性能
npm run perf:test        # 运行性能测试
npm run perf:quick       # 快速性能检查
```

---

## 17. 参考资源

- [Next.js 文档](https://nextjs.org/docs)
- [React 文档](https://react.dev)
- [TypeScript 文档](https://www.typescriptlang.org/docs)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [next-intl 文档](https://next-intl-docs.vercel.app/)

---

**最后更新**: 2026-03-20  
**版本**: 1.0
