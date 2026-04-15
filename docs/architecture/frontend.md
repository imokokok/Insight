# Frontend Architecture

> Frontend component and page architecture for the Insight platform

## Table of Contents

- [Overview](#overview)
- [Component Architecture](#component-architecture)
- [Page Structure](#page-structure)
- [Routing Design](#routing-design)
- [Performance Optimization](#performance-optimization)

## Overview

The Insight frontend is built on Next.js 16 App Router, adopting a Server Components-first architecture design:

```mermaid
graph TB
    subgraph Frontend["Frontend Architecture"]
        A[Server Components] --> B[Client Components]
        B --> C[Hooks]
        C --> D[Services]
        D --> E[API Layer]
    end

    subgraph Components["Component Layers"]
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

### Design Principles

1. **Server Components First**: Use Server Components by default to reduce client-side JS
2. **Progressive Enhancement**: Core functionality works without JavaScript, interactive features are progressively enhanced
3. **Component Reuse**: Establish clear component hierarchy to maximize code reuse
4. **Performance First**: Code splitting, lazy loading, virtualization, and other optimization techniques

## Component Architecture

### Component Layers

```
src/components/
├── alerts/            # Alert components
├── charts/            # General charts
├── data-transparency/ # Data transparency components
├── error-boundary/    # Error boundary components
├── export/            # Export components
├── favorites/         # Favorites components
├── navigation/        # Navigation components
├── realtime/          # Real-time components
├── search/            # Search components
├── settings/          # Settings components
├── shortcuts/         # Keyboard shortcuts
├── ui/                # Base UI components
└── accessibility/     # Accessibility components
```

### Component Categories

| Layer   | Purpose               | Examples                           | Dependencies                  |
| ------- | --------------------- | ---------------------------------- | ----------------------------- |
| Page    | Page-level components | `ChainlinkPage`, `CrossOraclePage` | Can use all lower layers      |
| Feature | Feature components    | `PriceChart`, `AlertConfig`        | Uses UI and Shared components |
| UI      | Base UI               | `Button`, `Card`, `Input`          | Only uses Shared components   |
| Shared  | Shared utilities      | `LoadingState`, `ErrorFallback`    | No dependencies               |

### Server Components

```typescript
// src/app/[locale]/price-query/page.tsx
import { PriceQueryContent } from './PriceQueryContent';

export default async function PriceQueryPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  return <PriceQueryContent />;
}
```

### Client Components

```typescript
// src/app/[locale]/price-query/components/PriceChart.tsx
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
import { usePriceHistory } from '@/hooks/data/useOracleData';
import { Card } from '@/components/ui/Card';

interface PriceChartProps {
  provider: OracleProvider;
  symbol: string;
  chain?: Blockchain;
}

export function PriceChart({ provider, symbol, chain }: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('24H');
  const { data, isLoading } = usePriceHistory(provider, symbol, chain);

  if (isLoading) {
    return <ChartSkeleton />;
  }

  return (
    <Card>
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

### Compound Component Pattern

```typescript
// src/app/[locale]/cross-oracle/components/PriceTable.tsx
import { createContext, useContext } from 'react';

interface PriceComparisonContextValue {
  providers: OracleProvider[];
  symbol: string;
  prices: PriceData[];
}

const PriceComparisonContext = createContext<PriceComparisonContextValue | null>(null);

export function PriceTable({
  providers,
  symbol,
  children,
}: PriceTableProps) {
  const { data: prices } = useOraclePrices(providers, symbol);

  return (
    <PriceComparisonContext.Provider value={{ providers, symbol, prices }}>
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {children}
      </div>
    </PriceComparisonContext.Provider>
  );
}

export function PriceTableHeader() {
  const { providers, symbol } = useContext(PriceComparisonContext)!;
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold">{symbol} Price Comparison</h2>
    </div>
  );
}
```

## Page Structure

### Page Content Components

Each page uses a dedicated Content component that encapsulates the page logic:

```typescript
// src/app/[locale]/price-query/PriceQueryContent.tsx
'use client';

import { usePriceQuery } from './hooks/usePriceQuery';
import { QueryHeader } from './components/QueryHeader';
import { QueryForm } from './components/QueryForm';
import { QueryResults } from './components/QueryResults';
import { StatsCardsSelector } from './components/stats/StatsCardsSelector';

export function PriceQueryContent() {
  const {
    selectedProvider,
    selectedSymbol,
    priceData,
    isLoading,
    // ... more state
  } = usePriceQuery();

  return (
    <div className="space-y-6">
      <QueryHeader />
      <QueryForm />
      {isLoading ? (
        <QueryResultsLoading />
      ) : priceData ? (
        <>
          <StatsCardsSelector provider={selectedProvider} data={priceData} />
          <QueryResults data={priceData} />
        </>
      ) : (
        <QueryResultsEmpty />
      )}
    </div>
  );
}
```

### Page Implementation

```typescript
// src/app/[locale]/price-query/page.tsx
import { PriceQueryContent } from './PriceQueryContent';

export const metadata = {
  title: 'Price Query | Insight Oracle Analytics',
  description: 'Real-time oracle price feeds and analytics',
};

export default function PriceQueryPage() {
  return <PriceQueryContent />;
}
```

### Layout Components

```typescript
// src/app/[locale]/layout.tsx
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

## Routing Design

### Route Structure

All pages use the `[locale]/` route pattern for internationalization:

```
src/app/
├── [locale]/                         # Internationalized route group
│   ├── page.tsx                     # Home page /
│   ├── layout.tsx                   # Locale layout
│   │
│   ├── price-query/                 # Price query
│   │   └── page.tsx                 # /[locale]/price-query
│   │
│   ├── cross-oracle/                # Oracle comparison
│   │   └── page.tsx                 # /[locale]/cross-oracle
│   │
│   ├── cross-chain/                 # Cross-chain comparison
│   │   └── page.tsx                 # /[locale]/cross-chain
│   │
│   ├── alerts/                      # Alerts
│   │   └── page.tsx                 # /[locale]/alerts
│   │
│   ├── favorites/                   # Favorites
│   │   └── page.tsx                 # /[locale]/favorites
│   │
│   ├── settings/                    # Settings
│   │   └── page.tsx                 # /[locale]/settings
│   │
│   ├── docs/                        # Documentation
│   │   └── page.tsx                 # /[locale]/docs
│   │
│   ├── login/                       # Login
│   │   └── page.tsx                 # /[locale]/login
│   │
│   ├── register/                    # Register
│   │   └── page.tsx                 # /[locale]/register
│   │
│   └── auth/                        # Authentication related
│       ├── forgot-password/
│       │   └── page.tsx             # /[locale]/auth/forgot-password
│       ├── resend-verification/
│       │   └── page.tsx             # /[locale]/auth/resend-verification
│       ├── reset-password/
│       │   └── page.tsx             # /[locale]/auth/reset-password
│       └── verify-email/
│           └── page.tsx             # /[locale]/auth/verify-email
│
├── api/                             # API routes
│   ├── oracles/                     # Oracle data
│   ├── alerts/                      # Alert management
│   ├── favorites/                   # Favorite management
│   ├── auth/                        # Authentication
│   ├── health/                      # Health check
│   └── prices/                      # Price data
│
├── error.tsx                        # Global error page
├── not-found.tsx                    # 404 page
└── layout.tsx                       # Root layout
```

### Dynamic Routes

```typescript
// src/app/[locale]/snapshot/[id]/page.tsx
interface SnapshotPageProps {
  params: {
    locale: string;
    id: string;
  };
}

export default async function SnapshotPage({ params }: SnapshotPageProps) {
  const { id } = params;

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

export async function generateStaticParams() {
  const snapshots = await getPopularSnapshots();

  return snapshots.map((snapshot) => ({
    id: snapshot.id,
  }));
}

export async function generateMetadata({ params }: SnapshotPageProps) {
  const snapshot = await getSnapshot(params.id);

  return {
    title: `${snapshot.name} | Insight Snapshot`,
    description: snapshot.description,
  };
}
```

## Performance Optimization

### Code Splitting

```typescript
import dynamic from 'next/dynamic';

const PriceChart = dynamic(
  () => import('@/components/oracle/charts/PriceChart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
);

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { loading: () => <Loading /> }
);

function Dashboard() {
  const handleMouseEnter = () => {
    import('@/components/HeavyComponent');
  };

  return (
    <div onMouseEnter={handleMouseEnter}>
      <HeavyComponent />
    </div>
  );
}
```

### Data Prefetching

```typescript
import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/queries/client';

export default async function OraclePage() {
  const queryClient = getQueryClient();

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

### Component-Level Optimization

```typescript
import { memo, useMemo, useCallback } from 'react';

interface PriceListProps {
  prices: PriceData[];
  onSelect: (price: PriceData) => void;
}

export const PriceList = memo(function PriceList({
  prices,
  onSelect,
}: PriceListProps) {
  const sortedPrices = useMemo(() => {
    return [...prices].sort((a, b) => b.price - a.price);
  }, [prices]);

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

## Best Practices

### 1. Component Design

```typescript
function PriceCard({ price }: { price: PriceData }) {
  return (
    <Card>
      <PriceHeader price={price} />
      <PriceValue price={price.price} />
      <PriceChange change={price.change24hPercent} />
    </Card>
  );
}

function Card({ children, className }: CardProps) {
  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      {children}
    </div>
  );
}
```

### 2. State Management

```typescript
function Parent() {
  const [count, setCount] = useState(0);

  return (
    <>
      <ChildA count={count} />
      <ChildB onIncrement={() => setCount((c) => c + 1)} />
    </>
  );
}

const ThemeContext = createContext<Theme>('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <DeepTree />
    </ThemeContext.Provider>
  );
}
```

### 3. Error Handling

```typescript
function Chart({ data }: { data?: ChartData[] }) {
  if (!data || data.length === 0) {
    return <EmptyState message="No data available" />;
  }

  return <ChartRenderer data={data} />;
}
```

### 4. Style Management

```typescript
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
```

## Development Tools

### React Developer Tools

- Component tree inspection
- Props and State viewing
- Performance analysis

### Next.js Analysis

```bash
ANALYZE=true npm run build
next build --profile
```

### Performance Monitoring

```typescript
export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric);
}

export { reportWebVitals } from '@/lib/performance';
```
