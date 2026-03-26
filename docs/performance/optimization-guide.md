# Insight 性能优化指南

> 本指南涵盖 Insight 区块链预言机数据分析平台的性能优化最佳实践。

## 目录

1. [概述](#概述)
2. [代码分割](#代码分割)
3. [动态导入](#动态导入)
4. [图片优化](#图片优化)
5. [虚拟列表](#虚拟列表)
6. [性能监控](#性能监控)
7. [最佳实践](#最佳实践)

---

## 概述

Insight 项目采用多种性能优化策略来确保流畅的用户体验：

- **代码分割**: 按需加载组件，减少初始包体积
- **动态导入**: 延迟加载非关键组件
- **图片优化**: 使用 Next.js Image 组件和懒加载
- **虚拟列表**: 高效渲染大量数据
- **性能监控**: 实时监控 Web Vitals 和性能指标

---

## 代码分割

### 1. 页面级别代码分割

使用 `DynamicPageComponents` 实现页面级别的懒加载：

```typescript
import { DynamicCrossOraclePage } from '@/components/performance';

// 在路由配置中使用
const routes = [
  {
    path: '/cross-oracle',
    component: DynamicCrossOraclePage,
  },
];
```

### 2. 组件级别代码分割

使用 `createDynamicComponent` 创建动态组件：

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

// 使用组件
function Dashboard() {
  return <HeavyChart data={data} />;
}

// 预加载
HeavyChart.preload();
```

### 3. 预加载策略

#### 基于悬停的预加载

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

#### 基于空闲时间的预加载

```typescript
import { preloadWhenIdle } from '@/components/performance';

// 在应用初始化时
useEffect(() => {
  preloadWhenIdle([
    DynamicCrossOraclePage,
    DynamicMarketOverviewPage,
  ]);
}, []);
```

---

## 动态导入

### 1. 图表组件动态导入

项目已内置大量动态图表组件：

```typescript
import {
  DynamicPriceChart,
  DynamicPriceVolatilityChart,
  DynamicCrossChainTrendChart,
  DynamicLatencyTrendChart,
  preloadChart,
} from '@/components/oracle/charts';

// 使用动态图表
function PriceAnalysis() {
  return (
    <div>
      <DynamicPriceChart client={client} symbol="BTC" />
      <DynamicPriceVolatilityChart data={volatilityData} />
    </div>
  );
}

// 预加载特定图表
preloadChart('PriceChart');
```

### 2. 条件动态导入

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

## 图片优化

### 1. 使用 OptimizedImage 组件

```typescript
import { OptimizedImage, LazyImage, ResponsiveImage } from '@/components/performance';

// 基础用法
<OptimizedImage
  src="/logos/btc.svg"
  alt="Bitcoin"
  width={64}
  height={64}
  priority
/>

// 懒加载
<LazyImage
  src="/charts/large-chart.png"
  alt="Price Chart"
  threshold={0.2}
  rootMargin="100px"
/>

// 响应式图片
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

### 2. 图片格式优化

```typescript
// 使用 WebP 格式
<OptimizedImage
  src="/images/chart.png"
  alt="Chart"
  format="webp"
  quality={85}
/>

// 使用 AVIF 格式（更好的压缩）
<OptimizedImage
  src="/images/photo.jpg"
  alt="Photo"
  format="avif"
/>
```

### 3. 背景图片优化

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

## 虚拟列表

### 1. 基础虚拟列表

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

### 2. 虚拟网格

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

### 3. 无限滚动

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

## 性能监控

### 1. 使用 PerformanceMonitor 组件

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

### 2. 使用性能 Hooks

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
      // 触发性能优化
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

### 3. 性能追踪

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

  // 或使用 measureAsync
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

## 最佳实践

### 1. 组件优化

```typescript
// ✅ 使用 React.memo 避免不必要的重渲染
const PriceCard = memo(function PriceCard({ price }) {
  return <div>{price}</div>;
});

// ✅ 使用 useMemo 缓存计算结果
const sortedPrices = useMemo(() => {
  return [...prices].sort((a, b) => b.price - a.price);
}, [prices]);

// ✅ 使用 useCallback 缓存回调函数
const handleClick = useCallback(() => {
  onSelect(price);
}, [onSelect, price]);
```

### 2. 数据获取优化

```typescript
// ✅ 使用 React Query 的 staleTime 和 gcTime
const { data } = useQuery({
  queryKey: ['prices', symbol],
  queryFn: () => fetchPrice(symbol),
  staleTime: 30 * 1000, // 30 秒
  gcTime: 5 * 60 * 1000, // 5 分钟
});

// ✅ 使用 prefetchQuery 预取数据
const queryClient = useQueryClient();

const handleHover = (symbol: string) => {
  queryClient.prefetchQuery({
    queryKey: ['price', symbol],
    queryFn: () => fetchPrice(symbol),
  });
};
```

### 3. 渲染优化

```typescript
// ✅ 使用虚拟列表处理大量数据
<VirtualList
  items={largeDataset}
  renderItem={renderItem}
  estimateSize={50}
/>

// ✅ 使用 Intersection Observer 实现懒加载
const { observe, isVisible } = useLazyLoadOptimizer();

useEffect(() => {
  observe(containerRef.current);
}, [observe]);

// ✅ 避免在渲染中创建新对象
// ❌ 错误
<div style={{ color: 'red' }} />

// ✅ 正确
const style = useMemo(() => ({ color: 'red' }), []);
<div style={style} />
```

### 4. 内存优化

```typescript
// ✅ 及时清理事件监听器
useEffect(() => {
  const handler = () => {};
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);

// ✅ 使用 AbortController 取消请求
useEffect(() => {
  const controller = new AbortController();
  fetchData({ signal: controller.signal });
  return () => controller.abort();
}, []);

// ✅ 监控内存使用
const memory = useMemoryOptimizer();

useEffect(() => {
  if (memory.isCritical) {
    // 清理缓存
    clearCache();
  }
}, [memory.isCritical]);
```

---

## 性能预算

### 推荐指标

| 指标 | 目标 | 警告阈值 |
|------|------|----------|
| FCP | < 1.8s | 3.0s |
| LCP | < 2.5s | 4.0s |
| FID | < 100ms | 300ms |
| CLS | < 0.1 | 0.25 |
| TTFB | < 800ms | 1.8s |
| TBT | < 200ms | 600ms |

### JavaScript 包大小

| 类型 | 目标 | 警告阈值 |
|------|------|----------|
| 首屏 JS | < 300KB | 500KB |
| CSS | < 100KB | 150KB |
| 图片 | < 500KB | 1MB |

---

## 调试工具

### 1. Chrome DevTools

- **Performance**: 分析运行时性能
- **Lighthouse**: 生成性能报告
- **Network**: 监控资源加载
- **Memory**: 分析内存使用

### 2. React DevTools

- **Profiler**: 分析组件渲染性能
- **Components**: 检查组件树

### 3. Web Vitals Extension

安装 Chrome 扩展实时监控 Core Web Vitals。

---

## 总结

通过遵循以上最佳实践，可以显著提升 Insight 平台的性能：

1. **代码分割**: 减少初始加载时间
2. **动态导入**: 按需加载组件
3. **图片优化**: 减少图片加载时间
4. **虚拟列表**: 高效处理大量数据
5. **性能监控**: 持续跟踪和优化

记住，性能优化是一个持续的过程，需要定期监控和调整。
