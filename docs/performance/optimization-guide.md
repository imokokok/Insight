# Insight Performance Optimization Guide

> This guide covers performance optimization best practices for the Insight blockchain oracle data analytics platform.

## Table of Contents

1. [Overview](#overview)
2. [Code Splitting](#code-splitting)
3. [Dynamic Imports](#dynamic-imports)
4. [Image Optimization](#image-optimization)
5. [Virtual Lists](#virtual-lists)
6. [Performance Monitoring](#performance-monitoring)
7. [Best Practices](#best-practices)

---

## Overview

The Insight project employs multiple performance optimization strategies to ensure a smooth user experience:

- **Code Splitting**: Load components on demand to reduce initial bundle size
- **Dynamic Imports**: Lazy load non-critical components
- **Image Optimization**: Use Next.js Image component and lazy loading
- **Virtual Lists**: Efficiently render large amounts of data
- **Performance Monitoring**: Real-time monitoring of Web Vitals and performance metrics

---

## Code Splitting

### 1. Page-level Code Splitting

Use `DynamicPageComponents` for page-level lazy loading:

```typescript
import { DynamicCrossOraclePage } from '@/components/performance';

// Use in route configuration
const routes = [
  {
    path: '/cross-oracle',
    component: DynamicCrossOraclePage,
  },
];
```

### 2. Component-level Code Splitting

Use `createDynamicComponent` to create dynamic components:

```typescript
import { createDynamicComponent } from '@/components/performance';

const HeavyChart = createDynamicComponent(
  () => import('@/components/oracle/charts/HeavyChart'),
  {
    ssr: false,
    loading: <ChartSkeleton />,
    priority: 'high',
  }
);

// Use component
function Dashboard() {
  return <HeavyChart data={data} />;
}

// Preload
HeavyChart.preload();
```

### 3. Preloading Strategies

#### Hover-based Preloading

```typescript
import { preloadOnHover } from '@/components/performance';

function NavigationLink({ to, component }) {
  return (
    <Link href={to} {...preloadOnHover(component)}>
      Go to Page
    </Link>
  );
}
```

#### Idle-time Preloading

```typescript
import { preloadWhenIdle } from '@/components/performance';

// During application initialization
useEffect(() => {
  preloadWhenIdle([DynamicCrossOraclePage, DynamicMarketOverviewPage]);
}, []);
```

---

## Dynamic Imports

### 1. Chart Component Dynamic Imports

The project has built-in dynamic chart components:

```typescript
import {
  DynamicPriceChart,
  DynamicPriceVolatilityChart,
  DynamicCrossChainTrendChart,
  DynamicLatencyTrendChart,
  preloadChart,
} from '@/components/oracle/charts';

// Use dynamic charts
function PriceAnalysis() {
  return (
    <div>
      <DynamicPriceChart client={client} symbol="BTC" />
      <DynamicPriceVolatilityChart data={volatilityData} />
    </div>
  );
}

// Preload specific chart
preloadChart('PriceChart');
```

### 2. Conditional Dynamic Imports

```typescript
const AdvancedAnalytics = dynamic(
  () => import('@/components/analytics/AdvancedAnalytics'),
  {
    ssr: false,
    loading: () => <AnalyticsSkeleton />,
  }
);

function Dashboard({ showAdvanced }) {
  return (
    <div>
      {showAdvanced && <AdvancedAnalytics />}
    </div>
  );
}
```

---

## Image Optimization

### 1. Using OptimizedImage Component

```typescript
import { OptimizedImage } from '@/components/ui';
// Note: LazyImage and ResponsiveImage are planned features, not yet implemented

// Basic usage
<OptimizedImage
  src="/logos/btc.svg"
  alt="Bitcoin"
  width={64}
  height={64}
  priority
/>

// Lazy loading
<LazyImage
  src="/charts/large-chart.png"
  alt="Price Chart"
  threshold={0.2}
  rootMargin="100px"
/>

// Responsive image
<ResponsiveImage
  src="/hero/banner.jpg"
  alt="Hero Banner"
  aspectRatio="21 / 9"
  breakpoints={[
    { width: 640, size: '100vw' },
    { width: 1024, size: '50vw' },
  ]}
/>
```

### 2. Image Format Optimization

```typescript
// Use WebP format
<OptimizedImage
  src="/images/chart.png"
  alt="Chart"
  format="webp"
  quality={85}
/>

// Use AVIF format (better compression)
<OptimizedImage
  src="/images/photo.jpg"
  alt="Photo"
  format="avif"
/>
```

### 3. Background Image Optimization

```typescript
import { BackgroundImage } from '@/components/performance';

<BackgroundImage
  src="/backgrounds/hero.jpg"
  alt="Hero Background"
  parallax
  parallaxSpeed={0.3}
  overlayClassName="bg-black/30"
>
  <HeroContent />
</BackgroundImage>
```

---

## Virtual Lists

### 1. Basic Virtual List

```typescript
import { VirtualList } from '@/components/performance';

function LargeDataTable({ items }) {
  return (
    <VirtualList
      items={items}
      renderItem={(item, index) => (
        <DataRow key={item.id} data={item} />
      )}
      estimateSize={60}
      containerHeight={600}
      overscan={5}
    />
  );
}
```

### 2. Virtual Grid

```typescript
import { VirtualGrid } from '@/components/performance';

function AssetGrid({ assets }) {
  return (
    <VirtualGrid
      items={assets}
      renderItem={(asset) => <AssetCard asset={asset} />}
      columnCount={4}
      estimateSize={200}
      containerHeight={800}
      gap={16}
    />
  );
}
```

### 3. Infinite Scroll

```typescript
import { VirtualList } from '@/components/performance';

function InfinitePriceList() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);

  const loadMore = async () => {
    const newItems = await fetchPrices(page);
    setItems((prev) => [...prev, ...newItems]);
    setPage((p) => p + 1);
  };

  return (
    <VirtualList
      items={items}
      renderItem={(item) => <PriceItem data={item} />}
      estimateSize={80}
      containerHeight={600}
      onEndReached={loadMore}
      endReachedThreshold={300}
      loading={isLoading}
    />
  );
}
```

---

## Performance Monitoring

### 1. Using PerformanceMonitor Component

```typescript
import { PerformanceMonitor } from '@/components/performance';

function App() {
  return (
    <>
      <PerformanceMonitor
        enabled={process.env.NODE_ENV === 'development'}
        position="bottom-right"
        showDetails
        onPerformanceIssue={(issue) => {
          console.warn('Performance issue:', issue);
        }}
      />
      <MainContent />
    </>
  );
}
```

### 2. Using Performance Hooks

```typescript
import {
  usePerformanceOptimizer,
  useWebVitalsOptimizer,
  useMemoryOptimizer,
} from '@/hooks';

function Dashboard() {
  const performance = usePerformanceOptimizer();
  const webVitals = useWebVitalsOptimizer();
  const memory = useMemoryOptimizer();

  useEffect(() => {
    if (performance.health === 'poor') {
      // Trigger performance optimization
      optimizePerformance();
    }
  }, [performance.health]);

  return (
    <div>
      <PerformanceBadge health={performance.health} />
      <div>FCP: {webVitals.metrics.fcp}ms</div>
      <div>Memory: {memory.formatSize(memory.memory?.used || 0)}</div>
    </div>
  );
}
```

### 3. Performance Tracking

```typescript
import { usePerformanceTracker } from '@/hooks';

function DataFetcher() {
  const tracker = usePerformanceTracker('fetch-price-data');

  const fetchData = async () => {
    tracker.start();
    try {
      const data = await fetchPrices();
      return data;
    } finally {
      tracker.end({ symbol: 'BTC' });
    }
  };

  // Or use measureAsync
  const fetchDataSimple = () => {
    return tracker.measureAsync(
      () => fetchPrices(),
      { symbol: 'BTC' }
    );
  };

  return <button onClick={fetchData}>Fetch Data</button>;
}
```

---

## Best Practices

### 1. Component Optimization

```typescript
// ✅ Use React.memo to avoid unnecessary re-renders
const PriceCard = memo(function PriceCard({ price }) {
  return <div>{price}</div>;
});

// ✅ Use useMemo to cache computed results
const sortedPrices = useMemo(() => {
  return [...prices].sort((a, b) => b.price - a.price);
}, [prices]);

// ✅ Use useCallback to cache callback functions
const handleClick = useCallback(() => {
  onSelect(price);
}, [onSelect, price]);
```

### 2. Data Fetching Optimization

```typescript
// ✅ Use React Query's staleTime and gcTime
const { data } = useQuery({
  queryKey: ['prices', symbol],
  queryFn: () => fetchPrice(symbol),
  staleTime: 30 * 1000, // 30 seconds
  gcTime: 5 * 60 * 1000, // 5 minutes
});

// ✅ Use prefetchQuery for data prefetching
const queryClient = useQueryClient();

const handleHover = (symbol: string) => {
  queryClient.prefetchQuery({
    queryKey: ['price', symbol],
    queryFn: () => fetchPrice(symbol),
  });
};
```

### 3. Rendering Optimization

```typescript
// ✅ Use virtual lists for large datasets
<VirtualList
  items={largeDataset}
  renderItem={renderItem}
  estimateSize={50}
/>

// ✅ Use Intersection Observer for lazy loading
const { observe, isVisible } = useLazyLoadOptimizer();

useEffect(() => {
  observe(containerRef.current);
}, [observe]);

// ✅ Avoid creating new objects in render
// ❌ Wrong
<div style={{ color: 'red' }} />

// ✅ Correct
const style = useMemo(() => ({ color: 'red' }), []);
<div style={style} />
```

### 4. Memory Optimization

```typescript
// ✅ Clean up event listeners in time
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// ✅ Use AbortController to cancel requests
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal });
  return () => controller.abort();
}, []);

// ✅ Monitor memory usage
const memory = useMemoryOptimizer();

useEffect(() => {
  if (memory.isCritical) {
    // Clear cache
    clearCache();
  }
}, [memory.isCritical]);
```

---

## Performance Budget

### Web Vitals Metrics

| Metric | Target  | Warning Threshold | Description               |
| ------ | ------- | ----------------- | ------------------------- |
| LCP    | < 2.5s  | 4.0s              | Largest Contentful Paint  |
| INP    | < 200ms | 500ms             | Interaction to Next Paint |
| CLS    | < 0.1   | 0.25              | Cumulative Layout Shift   |
| FCP    | < 1.8s  | 3.0s              | First Contentful Paint    |
| TTFB   | < 800ms | 1.8s              | Time to First Byte        |

### JavaScript Bundle Size

| Type     | Target  | Warning Threshold |
| -------- | ------- | ----------------- |
| First JS | < 300KB | 500KB             |
| CSS      | < 100KB | 150KB             |
| Images   | < 500KB | 1MB               |

### Resource Limits

| Type                | Maximum Count |
| ------------------- | ------------- |
| Total Resources     | 50            |
| Third-party Scripts | 10            |
| Font Files          | 5             |

---

## Debugging Tools

### 1. Chrome DevTools

- **Performance**: Analyze runtime performance
- **Lighthouse**: Generate performance reports
- **Network**: Monitor resource loading
- **Memory**: Analyze memory usage

### 2. React DevTools

- **Profiler**: Analyze component rendering performance
- **Components**: Inspect component tree

### 3. Web Vitals Extension

Install Chrome extension for real-time Core Web Vitals monitoring.

---

## Summary

By following the best practices above, you can significantly improve the performance of the Insight platform:

1. **Code Splitting**: Reduce initial load time
2. **Dynamic Imports**: Load components on demand
3. **Image Optimization**: Reduce image loading time
4. **Virtual Lists**: Efficiently handle large amounts of data
5. **Performance Monitoring**: Continuously track and optimize

Remember, performance optimization is an ongoing process that requires regular monitoring and adjustment.
