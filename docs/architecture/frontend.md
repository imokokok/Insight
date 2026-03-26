# 前端架构

> Insight 平台的前端组件与页面架构

## 目录

- [概述](#概述)
- [组件架构](#组件架构)
- [页面结构](#页面结构)
- [路由设计](#路由设计)
- [性能优化](#性能优化)

## 概述

Insight 前端基于 Next.js 16 App Router 构建，采用 Server Components 优先的架构设计：

```mermaid
graph TB
    subgraph Frontend["前端架构"]
        A[Server Components] --> B[Client Components]
        B --> C[Hooks]
        C --> D[Services]
        D --> E[API Layer]
    end

    subgraph Components["组件分层"]
        F[Page Components]
        G[Feature Components]
        H[UI Components]
        I[Shared Components]
    end

    A --> F
    B --> G
    G --> H
    H --> I
```

### 设计原则

1. **Server Components 优先**：默认使用 Server Components，减少客户端 JS
2. **渐进式增强**：核心功能无需 JavaScript，交互功能逐步增强
3. **组件复用**：建立清晰的组件层次，最大化代码复用
4. **性能优先**：代码分割、懒加载、虚拟化等优化手段

## 组件架构

### 组件分层

```
components/
├── oracle/              # 预言机领域组件
│   ├── charts/         # 图表组件
│   ├── panels/         # 面板组件
│   ├── forms/          # 表单组件
│   └── shared/         # 共享组件
├── comparison/         # 对比功能组件
├── alerts/            # 警报组件
├── charts/            # 通用图表
├── ui/                # 基础 UI 组件
└── layout/            # 布局组件
```

### 组件分类

| 层级 | 用途 | 示例 | 依赖 |
|------|------|------|------|
| Page | 页面级组件 | `ChainlinkPage`, `CrossOraclePage` | 可使用所有下层组件 |
| Feature | 功能组件 | `PriceChart`, `AlertConfig` | 使用 UI 和 Shared 组件 |
| UI | 基础 UI | `Button`, `Card`, `Input` | 仅使用 Shared 组件 |
| Shared | 共享工具 | `LoadingState`, `ErrorFallback` | 无依赖 |

### Server Components

```typescript
// app/[locale]/chainlink/page.tsx
import { OracleClientFactory } from '@/lib/oracles/factory';
import { OracleProvider } from '@/types/oracle';
import { ChainlinkHero } from './components/ChainlinkHero';
import { MarketDataPanel } from '@/components/oracle/panels';

// Server Component - 无需 'use client'
export default async function ChainlinkPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  // 服务端数据获取
  const client = OracleClientFactory.getClient(OracleProvider.CHAINLINK);
  const initialData = await client.getPrice('BTC');

  return (
    <div className="space-y-8">
      <ChainlinkHero />
      <MarketDataPanel
        provider={OracleProvider.CHAINLINK}
        initialData={initialData}
      />
    </div>
  );
}
```

### Client Components

```typescript
// components/oracle/charts/PriceChart.tsx
'use client';

import { useState, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { usePriceHistory } from '@/hooks/queries';
import { Card } from '@/components/ui/Card';

interface PriceChartProps {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

export function PriceChart({ provider, symbol, chain }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const { data, isLoading } = usePriceHistory(provider, symbol, chain);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          {symbol} Price History
        </h3>
        <TimeRangeSelector
          value={timeRange}
          onChange={handleTimeRangeChange}
        />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <XAxis dataKey="timestamp" tickFormatter={formatDate} />
          <YAxis tickFormatter={formatPrice} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

### 复合组件模式

```typescript
// components/oracle/panels/MarketDataPanel.tsx
import { createContext, useContext } from 'react';

interface MarketDataContextValue {
  provider: OracleProvider;
  symbol: string;
  data: PriceData;
}

const MarketDataContext = createContext<MarketDataContextValue | null>(null);

// 根组件
export function MarketDataPanel({
  provider,
  symbol,
  children,
}: MarketDataPanelProps) {
  const { data } = useOraclePrice(provider, symbol);

  return (
    <MarketDataContext.Provider value={{ provider, symbol, data }}>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {children}
      </div>
    </MarketDataContext.Provider>
  );
}

// 子组件
export function MarketDataHeader() {
  const { symbol, data } = useContext(MarketDataContext)!;

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">{symbol}</h2>
      <PriceDisplay price={data.price} change={data.change24hPercent} />
    </div>
  );
}

export function MarketDataStats() {
  const { data } = useContext(MarketDataContext)!;

  return (
    <div className="grid grid-cols-3 gap-4 mt-4">
      <Stat label="24h High" value={data.high24h} />
      <Stat label="24h Low" value={data.low24h} />
      <Stat label="Volume" value={data.volume24h} />
    </div>
  );
}

// 使用
<MarketDataPanel provider={OracleProvider.CHAINLINK} symbol="BTC">
  <MarketDataHeader />
  <MarketDataStats />
</MarketDataPanel>
```

### 高阶组件 (HOC)

```typescript
// components/withErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';

interface WithErrorBoundaryOptions {
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
) {
  return class ErrorBoundary extends Component<P> {
    state = { hasError: false, error: null as Error | null };

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
      options.onError?.(error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        return (
          options.fallback || (
            <ErrorFallback
              error={this.state.error}
              onReset={() => this.setState({ hasError: false, error: null })}
            />
          )
        );
      }

      return <WrappedComponent {...this.props} />;
    }
  };
}

// 使用
const SafePriceChart = withErrorBoundary(PriceChart, {
  fallback: <ChartErrorFallback />,
});
```

## 页面结构

### 页面模板

```typescript
// components/oracle/shared/OraclePageTemplate.tsx
interface OraclePageTemplateProps {
  provider: OracleProvider;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function OraclePageTemplate({
  provider,
  title,
  description,
  children,
}: OraclePageTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center gap-4">
            <OracleLogo provider={provider} size="lg" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="mt-2 text-lg text-gray-600">{description}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <OracleSidebar provider={provider} />
          </aside>

          {/* Content */}
          <div className="lg:col-span-2 space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
```

### 具体页面实现

```typescript
// app/[locale]/chainlink/page.tsx
import { OraclePageTemplate } from '@/components/oracle/shared';
import { MarketDataPanel } from '@/components/oracle/panels';
import { PriceChart } from '@/components/oracle/charts';
import { NetworkHealthPanel } from '@/components/oracle/panels';
import { OracleProvider } from '@/types/oracle';

export const metadata = {
  title: 'Chainlink | Insight Oracle Analytics',
  description: 'Real-time Chainlink price feeds and network analytics',
};

export default function ChainlinkPage() {
  return (
    <OraclePageTemplate
      provider={OracleProvider.CHAINLINK}
      title="Chainlink"
      description="Decentralized oracle network providing reliable price feeds"
    >
      <MarketDataPanel provider={OracleProvider.CHAINLINK} symbol="BTC" />
      <PriceChart provider={OracleProvider.CHAINLINK} symbol="BTC" />
      <NetworkHealthPanel provider={OracleProvider.CHAINLINK} />
    </OraclePageTemplate>
  );
}
```

### 布局组件

```typescript
// app/[locale]/layout.tsx
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ReactQueryProvider } from '@/providers/ReactQueryProvider';
import { I18nProvider } from '@/providers/I18nProvider';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages(locale);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <ReactQueryProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </div>
      </ReactQueryProvider>
    </I18nProvider>
  );
}
```

## 路由设计

### 路由结构

```
app/
├── [locale]/                    # 国际化路由组
│   ├── page.tsx                # 首页
│   ├── layout.tsx              # 根布局
│   ├── chainlink/
│   │   └── page.tsx            # /[locale]/chainlink
│   ├── pyth/
│   │   └── page.tsx            # /[locale]/pyth
│   ├── cross-oracle/
│   │   └── page.tsx            # /[locale]/cross-oracle
│   ├── cross-chain/
│   │   └── page.tsx            # /[locale]/cross-chain
│   ├── market-overview/
│   │   └── page.tsx            # /[locale]/market-overview
│   ├── price-query/
│   │   └── page.tsx            # /[locale]/price-query
│   ├── alerts/
│   │   └── page.tsx            # /[locale]/alerts
│   ├── favorites/
│   │   └── page.tsx            # /[locale]/favorites
│   ├── settings/
│   │   └── page.tsx            # /[locale]/settings
│   ├── login/
│   │   └── page.tsx            # /[locale]/login
│   └── register/
│       └── page.tsx            # /[locale]/register
├── api/                         # API 路由
│   └── ...
├── error.tsx                    # 全局错误页面
├── not-found.tsx               # 404 页面
└── layout.tsx                  # 根布局
```

### 动态路由

```typescript
// app/[locale]/snapshot/[id]/page.tsx
interface SnapshotPageProps {
  params: {
    locale: string;
    id: string;
  };
}

export default async function SnapshotPage({ params }: SnapshotPageProps) {
  const { id } = params;

  // 获取快照数据
  const snapshot = await getSnapshot(id);

  if (!snapshot) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8">
      <SnapshotView snapshot={snapshot} />
    </div>
  );
}

// 生成静态参数
export async function generateStaticParams() {
  const snapshots = await getPopularSnapshots();

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
  }));
}

// 元数据
export async function generateMetadata({ params }: SnapshotPageProps) {
  const snapshot = await getSnapshot(params.id);

  return {
    title: `${snapshot.name} | Insight Snapshot`,
    description: snapshot.description,
  };
}
```

### 路由拦截

```typescript
// app/[locale]/(.)snapshot/[id]/page.tsx
// 拦截 /snapshot/[id] 路由，在模态框中显示

'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';

export default function SnapshotModal({ params }: { params: { id: string } }) {
  const router = useRouter();

  return (
    <Modal onClose={() => router.back()}>
      <SnapshotContent id={params.id} />
    </Modal>
  );
}
```

### 路由组

```typescript
// (marketing)/layout.tsx - 营销页面布局
// (app)/layout.tsx - 应用页面布局

// app/(marketing)/
//   layout.tsx
//   page.tsx           # 首页
//   about/
//     page.tsx

// app/(app)/
//   layout.tsx
//   dashboard/
//     page.tsx
//   settings/
//     page.tsx
```

## 性能优化

### 代码分割

```typescript
// 动态导入组件
import dynamic from 'next/dynamic';

const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // 禁用服务端渲染
  }
);

// 预加载
const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { loading: () => <Loading /> }
);

function Dashboard() {
  const handleMouseEnter = () => {
    // 预加载组件
    import('@/components/HeavyComponent');
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <HeavyComponent />
    </div>
  );
}
```

### 图片优化

```typescript
import Image from 'next/image';

function OracleLogo({ provider }: { provider: OracleProvider }) {
  return (
    <Image
      src={`/logos/oracles/${provider}.svg`}
      alt={`${provider} logo`}
      width={64}
      height={64}
      priority // 优先加载
      className="rounded-full"
    />
  );
}
```

### 字体优化

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

### 列表虚拟化

```typescript
// components/performance/VirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize: number;
}

export function VirtualList<T>({
  data,
  renderItem,
  estimateSize,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
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
            {renderItem(data[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 数据预取

```typescript
// 服务端预取
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queries/client';

export default async function OraclePage() {
  const queryClient = getQueryClient();

  // 预取数据
  await queryClient.prefetchQuery({
    queryKey: ['oracles', 'chainlink', 'price', 'BTC'],
    queryFn: () => fetchPrice('chainlink', 'BTC'),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ChainlinkPage />
    </HydrationBoundary>
  );
}
```

### 组件级优化

```typescript
// 使用 React.memo 避免不必要的重渲染
import { memo, useMemo, useCallback } from 'react';

interface PriceListProps {
  prices: PriceData[];
  onSelect: (price: PriceData) => void;
}

export const PriceList = memo(function PriceList({
  prices,
  onSelect,
}: PriceListProps) {
  // 缓存计算结果
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => b.price - a.price);
  }, [prices]);

  // 缓存回调函数
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
```

### 懒加载图片

```typescript
// components/performance/LazyImage.tsx
import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={className}>
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setIsLoaded(true)}
        />
      )}
      {!isLoaded && <ImageSkeleton />}
    </div>
  );
}
```

## 最佳实践

### 1. 组件设计

```typescript
// ✅ 单一职责
function PriceCard({ price }: { price: PriceData }) {
  return (
    <Card>
      <PriceHeader price={price} />
      <PriceValue price={price.price} />
      <PriceChange change={price.change24hPercent} />
    </Card>
  );
}

// ✅ 组合优于继承
function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  );
}

// ✅ 受控组件
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
```

### 2. 状态管理

```typescript
// ✅ 状态提升
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <ChildA count={count} />
      <ChildB onIncrement={() => setCount((c) => c + 1)} />
    </>
  );
}

// ✅ 使用 Context 避免 prop drilling
const ThemeContext = createContext<Theme>('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <DeepTree />
    </ThemeContext.Provider>
  );
}
```

### 3. 错误处理

```typescript
// ✅ 错误边界
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// ✅ 优雅降级
function Chart({ data }: { data?: ChartData[] }) {
  if (!data || data.length === 0) {
    return <EmptyState message="No data available" />;
  }

  return <ChartRenderer data={data} />;
}
```

### 4. 可访问性

```typescript
// ✅ 语义化 HTML
function Navigation() {
  return (
    <nav aria-label="Main navigation">
      <ul role="menubar">
        <li role="none">
          <a href="/" role="menuitem">
            Home
          </a>
        </li>
      </ul>
    </nav>
  );
}

// ✅ ARIA 属性
function Toggle({
  pressed,
  onChange,
}: {
  pressed: boolean;
  onChange: (pressed: boolean) => void;
}) {
  return (
    <button
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
    >
      {pressed ? 'On' : 'Off'}
    </button>
  );
}

// ✅ 键盘导航
function Dropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div onKeyDown={handleKeyDown}>
      {/* ... */}
    </div>
  );
}
```

### 5. 样式管理

```typescript
// ✅ 使用 Tailwind 的工具类
function Button({
  variant = 'primary',
  size = 'medium',
  children,
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md',
        'transition-colors focus:outline-none focus:ring-2',
        variant === 'primary' && 'bg-blue-600 text-white hover:bg-blue-700',
        variant === 'secondary' && 'bg-gray-100 text-gray-900 hover:bg-gray-200',
        size === 'small' && 'px-3 py-1.5 text-sm',
        size === 'medium' && 'px-4 py-2 text-base',
        size === 'large' && 'px-6 py-3 text-lg'
      )}
    >
      {children}
    </button>
  );
}

// ✅ CSS 变量
function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        '--primary-color': '#3b82f6',
        '--secondary-color': '#64748b',
      } as CSSProperties}
    >
      {children}
    </div>
  );
}
```

## 开发工具

### React Developer Tools

- 组件树检查
- Props 和 State 查看
- 性能分析

### Next.js 分析

```bash
# 构建分析
ANALYZE=true npm run build

# 性能追踪
next build --profile
```

### 性能监控

```typescript
// lib/performance.ts
export function reportWebVitals(metric: NextWebVitalsMetric) {
  // 发送到分析服务
  console.log(metric);
}

// app/layout.tsx
export { reportWebVitals } from '@/lib/performance';
```
