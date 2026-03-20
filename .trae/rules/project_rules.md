# Insight 项目代码规范

> 本规范适用于 Insight 区块链预言机数据分析平台的所有代码编写工作。
> 项目基于 Next.js 16 + React 19 + TypeScript 构建。

## 目录

1. [项目概述](#1-项目概述)
2. [架构规范](#2-架构规范)
3. [TypeScript 规范](#3-typescript-规范)
4. [React 组件规范](#4-react-组件规范)
5. [状态管理规范](#5-状态管理规范)
6. [样式和 CSS 规范](#6-样式和-css-规范)
7. [API 和数据获取规范](#7-api-和数据获取规范)
8. [错误处理规范](#8-错误处理规范)
9. [性能优化规范](#9-性能优化规范)
10. [测试规范](#10-测试规范)
11. [国际化规范](#11-国际化规范)
12. [安全规范](#12-安全规范)
13. [命名约定](#13-命名约定)
14. [导入导出规范](#14-导入导出规范)
15. [注释和文档规范](#15-注释和文档规范)

**附录**
- [附录 A: 快速参考](#附录-a-快速参考)
- [附录 B: 最佳实践检查清单](#附录-b-最佳实践检查清单)
- [附录 C: Git 提交规范](#附录-c-git-提交规范)

---

## 1. 项目概述

### 1.1 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Next.js | 16.1.6 | React 全栈框架 |
| UI 库 | React | 19.2.3 | 用户界面 |
| 语言 | TypeScript | 5.x | 类型安全 |
| 样式 | Tailwind CSS | 4.x | 原子化 CSS |
| 图表 | Recharts | 3.8.0 | 数据可视化 |
| 状态管理 | React Query | 5.90.21 | 服务端状态 |
| 客户端状态 | Zustand | 5.0.11 | UI 状态 |
| 数据库 | Supabase | 2.98.0 | PostgreSQL + Auth |
| 国际化 | next-intl | 4.8.3 | 多语言支持 |
| 动画 | Framer Motion | 12.36.0 | 交互动画 |
| 图标 | Lucide React | 0.577.0 | 图标库 |
| 监控 | Sentry | 10.43.0 | 错误监控 |
| 分析 | Vercel Analytics | 2.0.1 | 性能分析 |

### 1.2 项目特点

- **Server Components 优先** - 默认使用 React Server Components
- **类型安全** - TypeScript Strict Mode 启用
- **专业现代设计** - Insight Professional Finance 风格，使用微妙圆角（4-8px）和柔和阴影，平衡专业感与现代感
- **实时数据** - WebSocket + Supabase Realtime
- **多预言机支持** - Chainlink, Pyth, Band, API3, UMA 等

---

## 2. 架构规范

### 2.1 目录结构

```
src/
├── app/                          # Next.js App Router
│   ├── [locale]/                 # 国际化路由
│   │   ├── api3/                 # API3 预言机页面
│   │   ├── chainlink/            # Chainlink 页面
│   │   ├── cross-chain/          # 跨链分析页面
│   │   ├── cross-oracle/         # 跨预言机对比
│   │   ├── market-overview/      # 市场概览
│   │   ├── price-query/          # 价格查询
│   │   └── ...                   # 其他页面
│   ├── api/                      # API Routes
│   │   ├── oracles/              # 预言机数据 API
│   │   ├── alerts/               # 警报 API
│   │   └── ...
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
│
├── components/                   # React 组件
│   ├── oracle/                   # 预言机相关组件
│   │   ├── charts/               # 图表组件
│   │   ├── common/               # 通用预言机组件
│   │   └── panels/               # 面板组件
│   ├── alerts/                   # 警报组件
│   ├── charts/                   # 通用图表
│   ├── comparison/               # 对比组件
│   ├── export/                   # 导出组件
│   ├── navigation/               # 导航组件
│   └── ui/                       # 基础 UI 组件
│
├── hooks/                        # 自定义 Hooks
│   ├── api3/                     # API3 专用 hooks
│   ├── queries/                  # React Query hooks
│   ├── realtime/                 # 实时数据 hooks
│   └── __tests__/                # Hooks 测试
│
├── lib/                          # 核心库
│   ├── api/                      # API 层
│   │   ├── client/               # API 客户端
│   │   ├── middleware/           # 中间件
│   │   ├── validation/           # 验证逻辑
│   │   └── response/             # 响应处理
│   ├── oracles/                  # 预言机客户端
│   │   ├── base.ts               # 基础抽象类
│   │   ├── interfaces.ts         # 接口定义
│   │   ├── factory.ts            # 工厂模式
│   │   └── *.ts                  # 各预言机实现
│   ├── errors/                   # 错误处理
│   ├── di/                       # 依赖注入容器
│   ├── supabase/                 # Supabase 客户端
│   ├── utils/                    # 工具函数
│   └── config/                   # 配置文件
│
├── types/                        # TypeScript 类型
│   ├── oracle/                   # 预言机类型
│   ├── api/                      # API 类型
│   ├── ui/                       # UI 类型
│   └── auth/                     # 认证类型
│
├── i18n/                         # 国际化
│   ├── messages/                 # 翻译文件
│   ├── request.ts                # i18n 请求配置
│   └── routing.ts                # 路由配置
│
└── providers/                    # React Providers
    └── ReactQueryProvider.tsx
```

### 2.2 设计模式

#### 2.2.1 工厂模式 - Oracle Client

```typescript
// lib/oracles/factory.ts
export class OracleClientFactory {
  private static instances: Map<OracleProvider, BaseOracleClient> = new Map();

  static getClient(provider: OracleProvider): BaseOracleClient {
    if (!this.instances.has(provider)) {
      this.instances.set(provider, this.createClient(provider));
    }
    return this.instances.get(provider)!;
  }

  private static createClient(provider: OracleProvider): BaseOracleClient {
    switch (provider) {
      case OracleProvider.CHAINLINK:
        return new ChainlinkClient();
      case OracleProvider.PYTH:
        return new PythClient();
      // ...
    }
  }
}
```

#### 2.2.2 依赖注入

```typescript
// lib/di/Container.ts
export class Container {
  private services: Map<string, ServiceDescriptor> = new Map();
  private static instance: Container | null = null;

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(token: string, factory: ServiceFactory<T>, singleton = true): void {
    this.services.set(token, { factory, singleton });
  }

  resolve<T>(token: string): T {
    const descriptor = this.services.get(token);
    if (!descriptor) {
      throw new Error(`Service "${token}" not found`);
    }
    // ...
  }
}
```

#### 2.2.3 抽象基类

```typescript
// lib/oracles/base.ts
export abstract class BaseOracleClient {
  abstract name: OracleProvider;
  abstract supportedChains: Blockchain[];
  abstract getPrice(symbol: string, chain?: Blockchain): Promise<PriceData>;
  abstract getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period?: number
  ): Promise<PriceData[]>;

  protected config: OracleClientConfig;

  constructor(config?: OracleClientConfig) {
    this.config = { ...DEFAULT_CLIENT_CONFIG, ...config };
  }
}
```

---

## 3. TypeScript 规范

### 3.1 严格模式配置

项目启用 TypeScript Strict Mode，必须遵守：

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 3.2 类型定义规范

#### 3.2.1 使用 interface 定义对象形状

```typescript
// ✅ 正确
interface PriceData {
  provider: OracleProvider;
  symbol: string;
  price: number;
  timestamp: number;
  confidence?: number;
}

// ❌ 避免
 type PriceData = {
  provider: OracleProvider;
  // ...
};
```

#### 3.2.2 使用 type 定义联合类型和交叉类型

```typescript
// ✅ 正确
type ExportFormat = 'csv' | 'json' | 'excel';
type TimeRange = '1H' | '24H' | '7D' | '30D';
type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 交叉类型
type PriceWithMetadata = PriceData & {
  metadata: PriceMetadata;
};
```

#### 3.2.3 避免使用 any

```typescript
// ❌ 禁止
function processData(data: any): any {
  return data.value;
}

// ✅ 正确 - 使用 unknown + 类型守卫
function processData(data: unknown): number {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    const value = (data as { value: unknown }).value;
    if (typeof value === 'number') {
      return value;
    }
  }
  throw new Error('Invalid data format');
}

// ✅ 正确 - 使用泛型
function processData<T extends { value: number }>(data: T): number {
  return data.value;
}
```

### 3.3 枚举定义

```typescript
// ✅ 使用 const enum 提高性能
export const enum OracleProvider {
  CHAINLINK = 'chainlink',
  PYTH = 'pyth',
  BAND_PROTOCOL = 'band_protocol',
  API3 = 'api3',
  UMA = 'uma',
  REDSTONE = 'redstone',
  DIA = 'dia',
  TELLOR = 'tellor',
  CHRONICLE = 'chronicle',
  WINKLINK = 'winklink',
}

export const enum Blockchain {
  ETHEREUM = 'ethereum',
  ARBITRUM = 'arbitrum',
  OPTIMISM = 'optimism',
  // ...
}
```

### 3.4 泛型使用

```typescript
// ✅ 组件 Props 泛型
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
}

// ✅ API 响应泛型
interface ApiResponse<T> {
  data: T;
  timestamp: number;
  status: 'success' | 'error';
}

// ✅ Hook 返回类型
type UseQueryResult<T> = {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};
```

### 3.5 类型守卫

```typescript
// ✅ 类型守卫函数
function isPriceData(value: unknown): value is PriceData {
  return (
    typeof value === 'object' &&
    value !== null &&
    'provider' in value &&
    'symbol' in value &&
    'price' in value &&
    'timestamp' in value
  );
}

// ✅ 使用类型守卫
function processPrice(value: unknown): PriceData {
  if (isPriceData(value)) {
    return value; // TypeScript 知道这是 PriceData
  }
  throw new Error('Invalid price data');
}
```

---

## 4. React 组件规范

### 4.1 组件文件结构

```typescript
// components/oracle/PriceCard.tsx

// 1. 导入（按类型分组）
import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { usePriceData } from '@/hooks/usePriceData';
import type { PriceData } from '@/types/oracle';

// 2. Props 接口定义
interface PriceCardProps {
  symbol: string;
  provider: OracleProvider;
  showChange?: boolean;
  onClick?: (data: PriceData) => void;
}

// 3. 组件实现
export function PriceCard({
  symbol,
  provider,
  showChange = true,
  onClick,
}: PriceCardProps) {
  // 4. Hooks
  const { data, isLoading } = usePriceData(provider, symbol);
  const [isExpanded, setIsExpanded] = useState(false);

  // 5. 回调函数
  const handleClick = useCallback(() => {
    if (data && onClick) {
      onClick(data);
    }
  }, [data, onClick]);

  // 6. 渲染
  if (isLoading) {
    return <PriceCardSkeleton />;
  }

  return (
    <Card onClick={handleClick}>
      {/* ... */}
    </Card>
  );
}

// 7. 默认导出（可选）
export default PriceCard;
```

### 4.2 Server Components vs Client Components

#### Server Components（默认）

```typescript
// ✅ Server Component - 用于静态内容、数据获取
import { OracleClientFactory } from '@/lib/oracles/factory';

export default async function OraclePage({
  params,
}: {
  params: { locale: string };
}) {
  const client = OracleClientFactory.getClient(OracleProvider.CHAINLINK);
  const price = await client.getPrice('BTC');

  return (
    <div>
      <h1>Oracle Data</h1>
      <PriceDisplay data={price} />
    </div>
  );
}
```

#### Client Components

```typescript
// ✅ Client Component - 用于交互式组件
'use client';

import { useState, useEffect } from 'react';

export function InteractiveChart({ symbol }: { symbol: string }) {
  const [data, setData] = useState<ChartData[]>([]);

  useEffect(() => {
    // 客户端数据获取
  }, [symbol]);

  return <Chart data={data} />;
}
```

### 4.3 Props 命名和类型

```typescript
// ✅ Props 接口命名
interface ButtonProps { }
interface PriceChartProps { }
interface OracleComparisonSectionProps { }

// ✅ Props 解构
function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  onClick,
}: ButtonProps) {
  // ...
}

// ✅ 使用 React.ComponentProps 扩展
interface IconButtonProps extends React.ComponentProps<'button'> {
  icon: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

### 4.4 事件处理

```typescript
// ✅ 事件处理器命名
// 使用 handle + EventName 命名
function PriceCard({ onPriceUpdate }: PriceCardProps) {
  const handleClick = useCallback(() => {
    // ...
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    // ...
  }, []);

  const handlePriceChange = useCallback((newPrice: number) => {
    // ...
  }, []);

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {/* ... */}
    </div>
  );
}
```

### 4.5 Ref 转发

```typescript
// ✅ 使用 React.forwardRef
import { forwardRef } from 'react';

interface InputProps extends React.ComponentProps<'input'> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, ...props }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} {...props} />
        {error && <span className="error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

### 4.6 组件组合模式

```typescript
// ✅ Compound Component 模式
import { createContext, useContext } from 'react';

const TabsContext = createContext<TabsContextValue | null>(null);

export function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="tabs-list" role="tablist">{children}</div>;
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  return (
    <button
      role="tab"
      aria-selected={context.activeTab === value}
      onClick={() => context.setActiveTab(value)}
    >
      {children}
    </button>
  );
}

// 使用
<Tabs defaultValue="prices">
  <TabsList>
    <TabsTrigger value="prices">Prices</TabsTrigger>
    <TabsTrigger value="charts">Charts</TabsTrigger>
  </TabsList>
</Tabs>
```

---

## 5. 状态管理规范

### 5.1 React Query 规范

#### Query Keys 管理

```typescript
// lib/queries/queryKeys.ts
export const queryKeys = {
  oracles: {
    all: ['oracles'] as const,
    detail: (provider: OracleProvider) => ['oracles', provider] as const,
    price: (provider: OracleProvider, symbol: string, chain?: Blockchain) =>
      ['oracles', provider, 'price', symbol, chain] as const,
    history: (provider: OracleProvider, symbol: string, period: number) =>
      ['oracles', provider, 'history', symbol, period] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    detail: (id: string) => ['alerts', id] as const,
    events: ['alertEvents'] as const,
  },
} as const;
```

#### Query Hooks

```typescript
// hooks/queries/useOraclePrices.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queries/queryKeys';

export function useOraclePrice(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
) {
  return useQuery({
    queryKey: queryKeys.oracles.price(provider, symbol, chain),
    queryFn: () => fetchOraclePrice(provider, symbol, chain),
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
  });
}

export function useRefreshOraclePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshPrice,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.oracles.price(
          variables.provider,
          variables.symbol,
          variables.chain
        ),
      });
    },
  });
}
```

### 5.2 Zustand Store 规范

```typescript
// stores/crossChainStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface CrossChainState {
  // State
  selectedProvider: OracleProvider;
  selectedSymbol: string;
  visibleChains: Blockchain[];
  loading: boolean;

  // Actions
  setSelectedProvider: (provider: OracleProvider) => void;
  setSelectedSymbol: (symbol: string) => void;
  toggleChain: (chain: Blockchain) => void;
  reset: () => void;
}

const initialState = {
  selectedProvider: OracleProvider.CHAINLINK,
  selectedSymbol: 'BTC',
  visibleChains: [Blockchain.ETHEREUM, Blockchain.ARBITRUM],
  loading: false,
};

export const useCrossChainStore = create<CrossChainState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSelectedProvider: (provider) =>
          set({ selectedProvider: provider }, false, 'setSelectedProvider'),

        setSelectedSymbol: (symbol) =>
          set({ selectedSymbol: symbol }, false, 'setSelectedSymbol'),

        toggleChain: (chain) =>
          set(
            (state) => ({
              visibleChains: state.visibleChains.includes(chain)
                ? state.visibleChains.filter((c) => c !== chain)
                : [...state.visibleChains, chain],
            }),
            false,
            'toggleChain'
          ),

        reset: () => set(initialState, false, 'reset'),
      }),
      {
        name: 'cross-chain-store',
        partialize: (state) => ({
          selectedProvider: state.selectedProvider,
          selectedSymbol: state.selectedSymbol,
        }),
      }
    ),
    { name: 'CrossChainStore' }
  )
);
```

### 5.3 Context 使用规范

```typescript
// contexts/AuthContext.tsx
import { createContext, useContext, useState, useCallback } from 'react';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const user = await authService.signIn(email, password);
      setUser(user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    setUser(null);
  }, []);

  const value = {
    user,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

// Custom hook for consuming context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

---

## 6. 样式和 CSS 规范

### 6.1 圆角使用规范

项目采用专业的微小圆角设计系统，保持专业感与现代感的平衡。

#### 圆角值标准

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `--radius-none` | 0 | 数据表格、分割线 |
| `--radius-sm` | 0.25rem (4px) | 小按钮、标签、状态指示器 |
| `--radius-md` | 0.375rem (6px) | 标准按钮、输入框 |
| `--radius-lg` | 0.5rem (8px) | 卡片、面板、模态框 |
| `--radius-xl` | 0.75rem (12px) | 大卡片、弹窗 |
| `--radius-2xl` | 1rem (16px) | 特殊容器 |
| `--radius-full` | 9999px | 圆形元素（头像、徽章） |

#### 组件圆角应用规范

```typescript
// ✅ 按钮使用 --radius-md (6px)
<button className="rounded-md ...">Click me</button>

// ✅ 卡片使用 --radius-lg (8px)
<div className="rounded-lg ...">Card content</div>

// ✅ 输入框使用 --radius-md (6px)
<input className="rounded-md ..." />

// ✅ 表格容器使用 --radius-lg (8px)，内部无圆角
<div className="rounded-lg overflow-hidden">
  <table className="rounded-none">...</table>
</div>

// ✅ 徽章/标签使用 --radius-full (完全圆角)
<span className="rounded-full ...">Badge</span>

// ✅ 模态框/弹窗使用 --radius-xl (12px)
<div className="rounded-xl ...">Modal content</div>
```

#### 设计原则

- **保持克制**：圆角值不超过 12px（除圆形元素外）
- **层次分明**：交互元素使用较小圆角，容器使用较大圆角
- **统一协调**：同一类组件使用相同的圆角值
- **专业感**：避免过大的圆角导致"卡通感"

### 6.2 Tailwind CSS 使用规范

#### 类名顺序

```typescript
// ✅ 按以下顺序组织 Tailwind 类名：
// 1. 布局 (display, position, flex, grid)
// 2. 尺寸 (width, height, padding, margin)
// 3. 背景 (background-color, background-image)
// 4. 边框 (border, border-radius)
// 5. 文字 (font-size, font-weight, color)
// 6. 效果 (shadow, opacity, transition)
// 7. 交互 (hover, focus, active)
// 8. 响应式 (sm:, md:, lg:)

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        /* 布局 */
        flex flex-col
        /* 尺寸 */
        w-full p-4
        /* 背景 */
        bg-white
        /* 边框 */
        rounded-lg border border-gray-200
        /* 文字 */
        text-sm text-gray-900
        /* 效果 */
        shadow-sm transition-all duration-200
        /* 交互 */
        hover:border-gray-300 hover:shadow-md
        /* 响应式 */
        sm:p-6 md:p-8
      "
    >
      {children}
    </div>
  );
}
```

#### 使用 clsx 和 tailwind-merge

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// ✅ 工具函数
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ✅ 使用示例
function Button({
  variant = 'primary',
  size = 'medium',
  className,
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(
        // 基础样式 - 使用 rounded-md (6px) 保持专业感
        'inline-flex items-center justify-center font-medium rounded-md transition-all',
        // 变体样式
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
        variant === 'ghost' && 'bg-transparent text-gray-600 hover:bg-gray-100',
        // 尺寸样式
        size === 'small' && 'px-3 py-1.5 text-sm',
        size === 'medium' && 'px-4 py-2 text-base',
        size === 'large' && 'px-6 py-3 text-lg',
        // 外部传入的类名
        className
      )}
    >
      {children}
    </button>
  );
}
```

### 6.2 CSS 变量使用

```typescript
// globals.css 中定义的变量
:root {
  /* 品牌色 */
  --finance-primary: #1e40af;
  --finance-secondary: #3b82f6;
  --finance-accent: #60a5fa;

  /* 状态色 */
  --finance-success: #10b981;
  --finance-warning: #f59e0b;
  --finance-danger: #ef4444;
  --finance-neutral: #64748b;

  /* 背景 */
  --bg-insight: #fafafa;
  --border-insight-separator: #e5e7eb;
}

// ✅ 组件中使用 - 徽章使用 rounded-full 完全圆角
function StatusBadge({ status }: { status: 'success' | 'warning' | 'error' }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full"
      style={{
        backgroundColor:
          status === 'success'
            ? 'var(--finance-success-light)'
            : status === 'warning'
              ? 'var(--finance-warning-light)'
              : 'var(--finance-danger-light)',
        color:
          status === 'success'
            ? 'var(--finance-success)'
            : status === 'warning'
              ? 'var(--finance-warning)'
              : 'var(--finance-danger)',
      }}
    >
      {status}
    </span>
  );
}
```

### 6.3 响应式设计

```typescript
// ✅ 移动优先设计 - 表格容器使用 rounded-lg，内部表格无圆角
function PriceTable({ data }: { data: PriceData[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full rounded-none">
        <thead>
          <tr className="hidden md:table-row">
            {/* 桌面端显示所有列 */}
            <th className="text-left">Symbol</th>
            <th className="text-right">Price</th>
            <th className="text-right">24h Change</th>
            <th className="text-right">Volume</th>
          </tr>
          <tr className="md:hidden">
            {/* 移动端简化 */}
            <th className="text-left">Asset</th>
            <th className="text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.symbol}>
              <td className="flex items-center gap-2">
                <span className="font-medium">{item.symbol}</span>
                <span className="hidden text-sm text-gray-500 sm:inline">
                  {item.name}
                </span>
              </td>
              <td className="text-right font-tabular">${item.price}</td>
              <td className="hidden text-right md:table-cell">
                {item.change24h}%
              </td>
              <td className="hidden text-right lg:table-cell">
                ${item.volume}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 7. API 和数据获取规范

### 7.1 API Route 结构

```typescript
// app/api/oracles/[provider]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OracleClientFactory } from '@/lib/oracles/factory';
import { validateProvider } from '@/lib/api/validation';
import { createCachedJsonResponse } from '@/lib/api/response';
import { withErrorHandler } from '@/lib/api/middleware';

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { provider: string } }
) => {
  // 1. 验证 provider
  const validationError = validateProvider(params.provider);
  if (validationError) return validationError;

  // 2. 获取查询参数
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const chain = searchParams.get('chain');

  if (!symbol) {
    return NextResponse.json(
      { error: { code: 'MISSING_PARAMS', message: 'Symbol is required' } },
      { status: 400 }
    );
  }

  // 3. 获取数据
  const client = OracleClientFactory.getClient(params.provider as OracleProvider);
  const price = await client.getPrice(symbol, chain as Blockchain);

  // 4. 返回缓存响应
  return createCachedJsonResponse(price, {
    maxAge: 30,
    staleWhileRevalidate: 60,
  });
});
```

### 7.2 API 客户端

```typescript
// lib/api/client/ApiClient.ts
import { ApiError } from './ApiError';

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
}

export class ApiClient {
  private baseUrl: string;
  private defaultConfig: RequestConfig;

  constructor(baseUrl: string, defaultConfig: RequestConfig = {}) {
    this.baseUrl = baseUrl;
    this.defaultConfig = {
      timeout: 10000,
      retries: 3,
      ...defaultConfig,
    };
  }

  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', path, undefined, config);
  }

  async post<T>(path: string, body: unknown, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', path, body, config);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const mergedConfig = { ...this.defaultConfig, ...config };

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...mergedConfig.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      ...mergedConfig,
    });

    if (!response.ok) {
      throw new ApiError(
        `API request failed: ${response.statusText}`,
        response.status,
        await response.json().catch(() => null)
      );
    }

    return response.json();
  }
}
```

### 7.3 数据验证

> **注意**: 如需使用 Zod 进行运行时验证，请先安装: `npm install zod`

```typescript
// lib/api/validation/schemas.ts
import { z } from 'zod';

export const PriceQuerySchema = z.object({
  symbol: z.string().min(1).max(20).toUpperCase(),
  chain: z.enum(Object.values(Blockchain) as [string, ...string[]]).optional(),
  period: z.coerce.number().int().min(1).max(365).default(24),
});

export const AlertConfigSchema = z.object({
  symbol: z.string().min(1),
  provider: z.enum(Object.values(OracleProvider) as [string, ...string[]]),
  conditionType: z.enum(['above', 'below', 'change_percent']),
  targetValue: z.number().positive(),
});

// 类型推断
export type PriceQueryInput = z.infer<typeof PriceQuerySchema>;
export type AlertConfigInput = z.infer<typeof AlertConfigSchema>;
```

#### 替代方案：手动验证

如果不需要引入 Zod，可以使用 TypeScript 类型守卫进行验证：

```typescript
// lib/api/validation/manual.ts
export function validatePriceQuery(input: unknown): { symbol: string; chain?: string; period: number } {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Invalid input: expected object');
  }
  
  const { symbol, chain, period } = input as Record<string, unknown>;
  
  if (typeof symbol !== 'string' || symbol.length === 0 || symbol.length > 20) {
    throw new Error('Invalid symbol');
  }
  
  return {
    symbol: symbol.toUpperCase(),
    chain: typeof chain === 'string' ? chain : undefined,
    period: typeof period === 'number' ? Math.min(Math.max(period, 1), 365) : 24,
  };
}
```

---

## 8. 错误处理规范

### 8.1 错误类层次结构

```typescript
// lib/errors/AppError.ts
export interface AppErrorOptions {
  message: string;
  code: string;
  statusCode: number;
  isOperational?: boolean;
  details?: Record<string, unknown>;
  cause?: Error;
}

export abstract class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = this.constructor.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.isOperational = options.isOperational ?? true;
    this.details = options.details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      isOperational: this.isOperational,
      details: this.details,
    };
  }
}

// 具体错误类
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super({
      message,
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super({
      message: `${resource}${id ? ` with id "${id}"` : ''} not found`,
      code: 'NOT_FOUND',
      statusCode: 404,
    });
  }
}

export class PriceFetchError extends AppError {
  constructor(
    message: string,
    details: {
      provider: OracleProvider;
      symbol: string;
      chain?: Blockchain;
      retryable: boolean;
    },
    cause?: Error
  ) {
    super({
      message,
      code: 'PRICE_FETCH_ERROR',
      statusCode: 502,
      details,
      cause,
    });
  }
}
```

### 8.2 错误边界

```typescript
// components/ErrorBoundaries.tsx
'use client';

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <ErrorFallback
            error={this.state.error}
            onReset={() => this.setState({ hasError: false, error: null })}
          />
        )
      );
    }

    return this.props.children;
  }
}

function ErrorFallback({
  error,
  onReset,
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
      <p className="mt-2 text-gray-600">
        {error?.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={onReset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

### 8.3 异步错误处理

```typescript
// ✅ 使用 try-catch 处理异步错误
async function fetchPriceData(
  provider: OracleProvider,
  symbol: string
): Promise<PriceData | null> {
  try {
    const client = OracleClientFactory.getClient(provider);
    return await client.getPrice(symbol);
  } catch (error) {
    if (error instanceof PriceFetchError) {
      // 已知错误类型
      logger.warn('Price fetch failed:', error.details);
      return null;
    }

    // 未知错误，重新抛出
    throw error;
  }
}

// ✅ 使用 Result 模式
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function fetchPriceSafe(
  provider: OracleProvider,
  symbol: string
): Promise<Result<PriceData, PriceFetchError>> {
  try {
    const client = OracleClientFactory.getClient(provider);
    const data = await client.getPrice(symbol);
    return { success: true, data };
  } catch (error) {
    if (error instanceof PriceFetchError) {
      return { success: false, error };
    }
    throw error;
  }
}

// 使用
const result = await fetchPriceSafe(OracleProvider.CHAINLINK, 'BTC');
if (result.success) {
  console.log(result.data.price);
} else {
  console.error(result.error.message);
}
```

---

## 9. 性能优化规范

### 9.1 组件优化

```typescript
// ✅ 使用 React.memo 避免不必要的重渲染
import { memo, useMemo, useCallback } from 'react';

interface PriceListProps {
  prices: PriceData[];
  onSelect: (price: PriceData) => void;
}

export const PriceList = memo(function PriceList({
  prices,
  onSelect,
}: PriceListProps) {
  // 使用 useMemo 缓存计算结果
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => b.price - a.price);
  }, [prices]);

  // 使用 useCallback 缓存回调函数
  const handleSelect = useCallback(
    (price: PriceData) => {
      onSelect(price);
    },
    [onSelect]
  );

  return (
    <ul>
      {sortedPrices.map((price) => (
        <PriceItem
          key={price.symbol}
          price={price}
          onSelect={handleSelect}
        />
      ))}
    </ul>
  );
});

// ✅ 使用 useMemo 缓存复杂对象
function useChartConfig(data: ChartData[]) {
  return useMemo(
    () => ({
      xAxis: { data: data.map((d) => d.timestamp) },
      yAxis: { min: Math.min(...data.map((d) => d.price)) },
      series: [{ data: data.map((d) => d.price) }],
    }),
    [data]
  );
}
```

### 9.2 懒加载和代码分割

```typescript
// ✅ 使用 dynamic import 进行代码分割
import dynamic from 'next/dynamic';

const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // 对于依赖浏览器 API 的组件
  }
);

// ✅ 预加载关键组件
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  {
    loading: () => <Loading />,
  }
);

// 在需要时预加载
function Dashboard() {
  const handleMouseEnter = () => {
    // 预加载组件
    const HeavyComponentPreload = import('@/components/HeavyComponent');
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <HeavyComponent />
    </div>
  );
}
```

### 9.3 数据获取优化

```typescript
// ✅ 使用 React Query 的 staleTime 和 cacheTime
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 分钟
      gcTime: 10 * 60 * 1000, // 10 分钟
      refetchOnWindowFocus: false,
      retry: 3,
    },
  },
});

// ✅ 使用 prefetchQuery 预取数据
function PriceTable() {
  const queryClient = useQueryClient();

  const handleHover = (symbol: string) => {
    queryClient.prefetchQuery({
      queryKey: ['price', symbol],
      queryFn: () => fetchPrice(symbol),
      staleTime: 60 * 1000,
    });
  };

  return (
    <table>
      {symbols.map((symbol) => (
        <tr key={symbol} onMouseEnter={() => handleHover(symbol)}>
          <td>{symbol}</td>
        </tr>
      ))}
    </table>
  );
}

// ✅ 使用 select 转换数据
function usePriceStats(symbol: string) {
  return useQuery({
    queryKey: ['prices', symbol],
    queryFn: () => fetchPriceHistory(symbol),
    select: (data) => ({
      min: Math.min(...data.map((p) => p.price)),
      max: Math.max(...data.map((p) => p.price)),
      avg: data.reduce((sum, p) => sum + p.price, 0) / data.length,
    }),
  });
}
```

### 9.4 列表渲染优化

```typescript
// ✅ 使用 react-window 或 react-virtualized 处理大数据列表
import { FixedSizeList as List } from 'react-window';

function VirtualPriceList({ prices }: { prices: PriceData[] }) {
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => (
      <div style={style}>
        <PriceItem price={prices[index]} />
      </div>
    ),
    [prices]
  );

  return (
    <List
      height={600}
      itemCount={prices.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </List>
  );
}

// ✅ 使用 @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ data }: { data: unknown[] }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} className="h-96 overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
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
            {data[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 10. 测试规范

### 10.1 测试文件位置

```
# 方案 1: __tests__ 目录
src/
├── hooks/
│   ├── usePriceData.ts
│   └── __tests__/
│       └── usePriceData.test.ts

# 方案 2: 与源文件同目录
src/
├── lib/
│   └── utils/
│       ├── format.ts
│       └── format.test.ts
```

### 10.2 单元测试

```typescript
// hooks/__tests__/usePriceData.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePriceData } from '../usePriceData';

// Mock 依赖
jest.mock('@/lib/oracles/factory', () => ({
  OracleClientFactory: {
    getClient: jest.fn(() => ({
      getPrice: jest.fn(),
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
    const mockPrice = {
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
    };

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

    expect(result.current.data).toEqual(mockPrice);
    expect(result.current.error).toBeNull();
  });

  it('should handle error state', async () => {
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

### 10.3 组件测试

```typescript
// components/__tests__/PriceCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { PriceCard } from '../PriceCard';

describe('PriceCard', () => {
  const mockPrice: PriceData = {
    symbol: 'BTC',
    price: 50000,
    change24h: 5.5,
    timestamp: Date.now(),
    provider: OracleProvider.CHAINLINK,
  };

  it('renders price information correctly', () => {
    render(<PriceCard data={mockPrice} />);

    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('$50,000.00')).toBeInTheDocument();
    expect(screen.getByText('+5.50%')).toBeInTheDocument();
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
});
```

### 10.4 集成测试

```typescript
// app/api/oracles/__tests__/route.test.ts
import { NextRequest } from 'next/server';
import { GET } from '../[provider]/route';

describe('/api/oracles/[provider]', () => {
  it('returns price data for valid provider and symbol', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/oracles/chainlink?symbol=BTC'
    );

    const response = await GET(request, {
      params: { provider: 'chainlink' },
    });

    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('symbol', 'BTC');
    expect(data).toHaveProperty('price');
    expect(data).toHaveProperty('timestamp');
  });

  it('returns 400 for missing symbol', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/oracles/chainlink'
    );

    const response = await GET(request, {
      params: { provider: 'chainlink' },
    });

    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid provider', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/oracles/invalid?symbol=BTC'
    );

    const response = await GET(request, {
      params: { provider: 'invalid' },
    });

    expect(response.status).toBe(400);
  });
});
```

---

## 11. 国际化规范

### 11.1 翻译文件结构

```
src/i18n/messages/
├── common.json           # 通用翻译
├── home.json            # 首页翻译
├── navigation.json      # 导航翻译
├── marketOverview.json  # 市场概览翻译
├── oracles/             # 预言机专用翻译
│   ├── chainlink.json
│   ├── pyth.json
│   └── ...
└── components/          # 组件翻译
    ├── charts.json
    └── alerts.json
```

### 11.2 翻译键命名

```json
// ✅ 使用层级命名
{
  "oracle": {
    "title": "Oracle Analytics",
    "description": "Real-time oracle data analysis",
    "actions": {
      "refresh": "Refresh Data",
      "export": "Export Data",
      "filter": "Filter Results"
    },
    "status": {
      "loading": "Loading...",
      "error": "Failed to load data",
      "empty": "No data available"
    }
  },
  "chart": {
    "timeRange": {
      "1h": "1 Hour",
      "24h": "24 Hours",
      "7d": "7 Days"
    }
  }
}
```

### 11.3 组件中使用

```typescript
// ✅ 使用 next-intl
'use client';

import { useTranslations } from 'next-intl';

function PriceCard({ symbol, price }: PriceCardProps) {
  const t = useTranslations('oracle');

  return (
    <div>
      <h3>{t('title')}</h3>
      <p>{t('description')}</p>
      <button>{t('actions.refresh')}</button>
    </div>
  );
}

// ✅ 带参数的翻译
function PriceDisplay({ price, change }: PriceDisplayProps) {
  const t = useTranslations('price');

  return (
    <div>
      <span>{t('current', { value: price.toFixed(2) })}</span>
      <span>
        {t('change', {
          value: change.toFixed(2),
          direction: change >= 0 ? 'up' : 'down',
        })}
      </span>
    </div>
  );
}

// messages/en.json
{
  "price": {
    "current": "Current Price: ${value}",
    "change": "{direction, select, up {+} down {-}}{value}%"
  }
}
```

### 11.4 服务端组件中使用

```typescript
// app/[locale]/page.tsx
import { getTranslations } from 'next-intl/server';

export default async function HomePage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: 'home' });

  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </div>
  );
}
```

---

## 12. 安全规范

### 12.1 输入验证

```typescript
// ✅ 始终验证用户输入
import { z } from 'zod';

const UserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(100).optional(),
});

export async function createUser(input: unknown) {
  const validated = UserInputSchema.parse(input);

  // 使用验证后的数据
  return db.user.create({
    data: validated,
  });
}
```

### 12.2 XSS 防护

```typescript
// ✅ 不要直接渲染用户输入
function Comment({ text }: { text: string }) {
  // ❌ 危险
  return <div dangerouslySetInnerHTML={{ __html: text }} />;

  // ✅ 安全
  return <div>{text}</div>;
}

// ✅ 使用 DOMPurify 清理 HTML
import DOMPurify from 'isomorphic-dompurify';

function RichContent({ html }: { html: string }) {
  const cleanHtml = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
}
```

### 12.3 环境变量安全

```typescript
// ✅ 服务端环境变量
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ 客户端环境变量（必须以 NEXT_PUBLIC_ 开头）
const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ 不要在客户端暴露敏感信息
// process.env.DATABASE_URL // 这不会在客户端可用
```

### 12.4 API 安全

```typescript
// ✅ 使用中间件进行认证
import { withAuth } from '@/lib/api/middleware';

export const POST = withAuth(async (request, { user }) => {
  // 只有认证用户才能访问
  const data = await request.json();
  return createAlert(user.id, data);
});

// ✅ 速率限制
import { withRateLimit } from '@/lib/api/middleware';

export const GET = withRateLimit(
  async (request) => {
    return fetchData();
  },
  { limit: 100, window: 60 } // 每分钟 100 次请求
);
```

---

## 13. 命名约定

### 13.1 文件命名

| 类型 | 命名方式 | 示例 |
|------|----------|------|
| 组件 | PascalCase | `PriceCard.tsx`, `OracleComparison.tsx` |
| Hooks | camelCase + use 前缀 | `usePriceData.ts`, `useChartZoom.ts` |
| 工具函数 | camelCase | `formatPrice.ts`, `calculateAverage.ts` |
| 类型定义 | PascalCase | `OracleTypes.ts`, `PriceData.ts` |
| 常量 | SCREAMING_SNAKE_CASE | `ORACLE_PROVIDERS.ts`, `API_ENDPOINTS.ts` |
| 配置文件 | camelCase 或 kebab-case | `next.config.ts`, `tailwind.config.js` |
| 测试文件 | 同被测文件 + .test | `PriceCard.test.tsx` |

### 13.2 变量命名

```typescript
// ✅ 布尔值使用 is/has/should 前缀
const isLoading = true;
const hasError = false;
const shouldRefresh = true;

// ✅ 数组使用复数形式
const prices: PriceData[] = [];
const users: User[] = [];

// ✅ 函数使用动词开头
function fetchPrice() {}
function handleClick() {}
function validateInput() {}

// ✅ 常量使用大写下划线
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;
const ORACLE_PROVIDERS = ['chainlink', 'pyth'] as const;

// ✅ 接口使用描述性名称
interface PriceData { }
interface OracleConfig { }
interface ApiResponse<T> { }

// ✅ 类型别名使用描述性名称
type PriceMap = Map<string, PriceData>;
type LoadingState = 'idle' | 'loading' | 'success' | 'error';
```

### 13.3 组件 Props 命名

```typescript
// ✅ Props 接口使用 ComponentName + Props
interface ButtonProps { }
interface PriceChartProps { }

// ✅ 回调函数使用 on + EventName
interface Props {
  onClick: () => void;
  onPriceUpdate: (price: PriceData) => void;
  onError: (error: Error) => void;
}

// ✅ 布尔 Props 使用描述性名称
interface Props {
  isLoading: boolean;
  isDisabled: boolean;
  showHeader: boolean;
}
```

---

## 14. 导入导出规范

### 14.1 导入顺序

```typescript
// 1. React 和 Next.js 内置
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// 2. 第三方库
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. 项目内部绝对导入
import { Button } from '@/components/ui/Button';
import { usePriceData } from '@/hooks/usePriceData';
import { OracleProvider } from '@/types/oracle';

// 4. 相对导入
import { utils } from './utils';
import styles from './styles.module.css';

// 5. 类型导入（使用 type 关键字）
import type { PriceData } from '@/types/oracle';
import type { ButtonProps } from '@/components/ui/Button';
```

### 14.2 导出模式

```typescript
// ✅ 命名导出（推荐）
export function Button() { }
export const ORACLE_PROVIDERS = ['chainlink', 'pyth'];
export interface ButtonProps { }

// ✅ 默认导出（仅用于页面和主要组件）
export default function HomePage() { }

// ✅ 重新导出
export { Button } from './Button';
export type { ButtonProps } from './Button';

// ✅ 索引文件导出
// components/ui/index.ts
export { Button } from './Button';
export { Card } from './Card';
export { Input } from './Input';
export type { ButtonProps } from './Button';
export type { CardProps } from './Card';

// ✅ 条件导出
export { PriceChart as default } from './PriceChart';
```

### 14.3 路径别名

```typescript
// ✅ 使用路径别名
import { Button } from '@/components/ui/Button';
import { usePriceData } from '@/hooks/usePriceData';
import { OracleProvider } from '@/types/oracle';
import { cn } from '@/lib/utils';

// ❌ 避免深层相对路径
import { Button } from '../../../components/ui/Button';
```

---

## 15. 注释和文档规范

### 15.1 文件头注释

```typescript
/**
 * @fileoverview 价格数据卡片组件
 * @description 显示单个资产的价格信息，支持实时更新和交互
 * @author Insight Team
 * @since 2024-01-01
 */

import { useState } from 'react';
// ...
```

### 15.2 函数和组件文档

```typescript
/**
 * 获取指定预言机和资产的价格数据
 *
 * @param provider - 预言机提供商
 * @param symbol - 资产符号（如 BTC, ETH）
 * @param chain - 可选的区块链网络
 * @returns 价格数据对象，包含当前价格、24小时变化等信息
 * @throws {PriceFetchError} 当获取价格失败时抛出
 *
 * @example
 * ```typescript
 * const price = await getPrice(OracleProvider.CHAINLINK, 'BTC');
 * console.log(price.price); // 50000
 * ```
 */
export async function getPrice(
  provider: OracleProvider,
  symbol: string,
  chain?: Blockchain
): Promise<PriceData> {
  // ...
}

/**
 * 价格数据展示卡片
 *
 * @param symbol - 资产符号
 * @param provider - 预言机提供商
 * @param showChange - 是否显示 24 小时变化，默认为 true
 * @param onClick - 点击回调函数
 */
export function PriceCard({
  symbol,
  provider,
  showChange = true,
  onClick,
}: PriceCardProps) {
  // ...
}
```

### 15.3 行内注释

```typescript
function calculateMetrics(data: PriceData[]) {
  // 过滤无效数据
  const validData = data.filter((d) => d.price > 0);

  // 计算平均值
  const average =
    validData.reduce((sum, d) => sum + d.price, 0) / validData.length;

  // TODO: 添加更多指标计算
  return { average };
}
```

### 15.4 TODO 和 FIXME 标记

```typescript
// TODO: 添加缓存机制以提高性能
// FIXME: 处理边界情况当数据为空时
// HACK: 临时解决方案，需要重构
// NOTE: 这个逻辑依赖于外部 API 的响应格式
// WARNING: 修改此代码可能影响其他模块
```

---

## 附录 A: 快速参考

### A.1 常用 ESLint 规则

```javascript
// eslint.config.mjs
export default [
  // ...
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
```

### A.2 Prettier 配置

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

### A.3 TypeScript 配置要点

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### A.4 常用命令

```bash
# 开发
npm run dev

# 构建
npm run build

# 代码检查
npm run lint

# 测试
npm run test
npm run test:watch
npm run test:coverage

# 类型检查
npx tsc --noEmit

# 格式化
npx prettier --write .
```

---

## 附录 B: 最佳实践检查清单

### 代码提交前检查

- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 所有测试通过
- [ ] 没有 `console.log` 或 `debugger` 语句
- [ ] 没有硬编码的敏感信息
- [ ] 组件有适当的加载和错误状态
- [ ] 新功能有对应的测试

### 代码审查检查

- [ ] 遵循命名约定
- [ ] 类型定义完整
- [ ] 错误处理完善
- [ ] 性能考虑（memo, useMemo, useCallback）
- [ ] 可访问性（ARIA 属性、键盘导航）
- [ ] 国际化（翻译键完整）
- [ ] 文档和注释清晰

---

## 附录 C: Git 提交规范

### C.1 Conventional Commits

项目遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### C.2 提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(oracles): add Pyth Network support` |
| `fix` | 修复 bug | `fix(charts): resolve tooltip positioning issue` |
| `docs` | 文档更新 | `docs(readme): update installation guide` |
| `style` | 代码格式 | `style(components): format with prettier` |
| `refactor` | 重构 | `refactor(hooks): simplify usePriceData logic` |
| `perf` | 性能优化 | `perf(queries): add caching for price data` |
| `test` | 测试相关 | `test(api): add unit tests for oracle handlers` |
| `chore` | 构建/工具 | `chore(deps): update dependencies` |
| `ci` | CI/CD | `ci(github): add automated testing workflow` |

### C.3 提交范围

常用范围：
- `oracles` - 预言机相关
- `components` - 组件
- `hooks` - Hooks
- `api` - API 路由
- `lib` - 核心库
- `styles` - 样式
- `i18n` - 国际化
- `tests` - 测试
- `docs` - 文档

### C.4 提交示例

```bash
# 新功能
feat(oracles): add real-time price updates for Chainlink

# 修复
fix(ui): resolve mobile navigation overlap issue

# 重构
refactor(queries): migrate from SWR to React Query

# 性能优化
perf(charts): implement virtual scrolling for large datasets

# 带作用域的提交
feat(api/oracles): add batch price query endpoint

# 带破坏性变更
feat(auth)!: remove legacy login method

BREAKING CHANGE: The old OAuth flow is no longer supported.
```

### C.5 提交信息规范

- **subject** 使用现在时态，首字母小写，不加句号
- **body** 详细说明变更原因和实现方式
- **footer** 用于引用 issue 或说明破坏性变更

```bash
# 好的提交信息
feat(alerts): add email notification support

Implement email notifications for price alerts using SendGrid.
Supports HTML templates and multi-language content.

Closes #123

# 不好的提交信息
update code
fixed bug
```

---

**最后更新**: 2024-03-20
**版本**: 1.0.0
**维护者**: Insight Team
