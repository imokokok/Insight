# Performance Optimization Guide

## Overview

This guide documents the performance optimization strategies and techniques used in the Insight Oracle Data Analytics Platform. It covers the actual implementation patterns found in the codebase.

---

## 1. Data Fetching Optimization

### 1.1 React Query Configuration

The application uses React Query with optimized defaults for server state management:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
```

**Key optimizations:**

- **Stale time of 5 minutes** prevents unnecessary refetches for data that doesn't change frequently
- **Garbage collection time of 10 minutes** balances memory usage with data availability
- **Disabled refetch on window focus** reduces API calls during tab switching
- **Exponential backoff retry** prevents overwhelming failing services

### 1.2 Oracle Client Caching

Each oracle client implements an LRU cache with TTL:

```typescript
import { OracleCache } from '@/lib/oracles/base';

const cache = new OracleCache(maxSize, ttlMs);
```

**Cache behavior:**

- LRU eviction when cache exceeds `MAX_CACHE_SIZE`
- TTL-based invalidation with `ORACLE_CACHE_TTL` (default: 30 seconds)
- Per-client cache instances for RedStone, Supra, and Flare clients
- `clearCache()` method available for manual invalidation

### 1.3 Database Caching Layer

The oracle storage layer provides database caching with configurable TTL:

```typescript
import { configureStorage, shouldUseDatabase } from '@/lib/oracles/utils/storage';

configureStorage({
  enabled: true,
  defaultExpirationHours: 24,
});
```

### 1.4 TWAP On-Chain Service Caching

The TWAP service uses a 30-second in-memory cache:

```typescript
class TwapOnChainService {
  private cache: Map<string, { data: TwapPriceData; timestamp: number }>;
  private readonly CACHE_TTL = 30_000; // 30 seconds
}
```

---

## 2. Component Rendering Optimization

### 2.1 Skeleton Loading States

The application uses skeleton components for perceived performance:

```typescript
import { ChartSkeleton, HeroSkeleton } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
```

- `ChartSkeleton` - Placeholder for chart components during loading
- `HeroSkeleton` - Placeholder for hero/dashboard sections
- `Skeleton` - Generic skeleton component for any content area

### 2.2 Error Boundaries

The `ErrorBoundary` component prevents cascading failures:

```typescript
import {
  ErrorBoundary,
  SectionErrorBoundary,
  ComponentErrorBoundary,
} from '@/components/error-boundary';
```

**Error boundary levels:**

- `ErrorBoundary` - Global level (full page fallback)
- `SectionErrorBoundary` - Section level (partial page fallback)
- `ComponentErrorBoundary` - Component level (inline fallback)

### 2.3 Live Status Indicators

Real-time status feedback via `LiveStatusBar`:

```typescript
import { LiveStatusBar } from '@/components/ui';
```

---

## 3. Data Processing Optimization

### 3.1 Downsampling for Charts

The application includes chart data downsampling utilities:

```typescript
import { downsampleData } from '@/lib/utils/downsampling';
```

This reduces the number of data points rendered in charts, improving rendering performance while maintaining visual accuracy.

### 3.2 Technical Indicators

Technical indicator calculations are optimized in `src/lib/indicators/calculations.ts`:

- Moving Average (MA)
- Exponential Moving Average (EMA)
- Relative Strength Index (RSI)
- MACD
- Bollinger Bands
- Average True Range (ATR)

### 3.3 Anomaly Detection

Anomaly calculations use efficient statistical methods:

```typescript
import {
  detectPriceAnomalies,
  calculateZScore,
} from '@/lib/services/marketData/anomalyCalculations';
```

### 3.4 Performance Metrics Calculator

Oracle performance metrics are calculated efficiently:

```typescript
import { calculatePerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
```

---

## 4. Memory Management

### 4.1 Oracle Memory Manager

The oracle memory manager controls memory usage for cached data:

```typescript
import { memoryManager } from '@/lib/oracles/utils/memoryManager';
```

### 4.2 Cache Cleanup

Oracle clients with their own caches provide cleanup methods:

```typescript
const redstoneClient = new RedStoneClient();
redstoneClient.clearCache();

const supraClient = new SupraClient();
supraClient.clearCache();

const flareClient = new FlareClient();
flareClient.clearCache();
```

---

## 5. Auto-Refresh System

### 5.1 Configurable Refresh Intervals

The auto-refresh hook supports multiple intervals:

```typescript
import { useAutoRefresh, REFRESH_INTERVALS, refreshIntervalToMs } from '@/hooks/useAutoRefresh';
import type { RefreshInterval } from '@/hooks/useAutoRefresh';
```

**Available intervals:**

- `5s`, `10s`, `30s`, `1m`, `5m`, `15m`, `30m`, `1h`

### 5.2 Smart Refresh Strategy

The auto-refresh system:

- Pauses when the tab is not visible (via `document.visibilityState`)
- Respects the user's selected interval preference
- Provides a manual refresh trigger
- Tracks last updated timestamp

---

## 6. Debounce and Throttle

### 6.1 Debounce Hook

```typescript
import { useDebounce, useDebouncedCallback } from '@/hooks/utils/useDebounce';
```

Used for:

- Search input debouncing
- Filter change debouncing
- Chart interaction debouncing

---

## 7. Export Performance

### 7.1 Chart Export Utilities

Chart exports use optimized utilities:

```typescript
import { exportChart } from '@/lib/utils/chartExport';
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPDF,
} from '@/lib/utils/chartExport/formats';
```

**Supported formats:**

- CSV (native)
- JSON (native)
- Excel (via jsPDF-AutoTable)
- PDF (via jsPDF-AutoTable)
- PNG (via html2canvas)
- ZIP (via JSZip for batch exports)

---

## 8. Real-time Performance

### 8.1 WebSocket Connection Management

The WebSocket manager includes performance optimizations:

```typescript
import { WebSocketManager } from '@/lib/realtime/websocket';
```

**Optimizations:**

- Heartbeat mechanism (30s interval, 10s timeout)
- Automatic reconnection with configurable max attempts
- Channel-based subscription management
- Message handler deduplication

### 8.2 Supabase Realtime

Real-time subscriptions are managed efficiently:

```typescript
import { realtimeManager } from '@/lib/supabase/realtime';
```

**Optimizations:**

- Subscription deduplication
- Automatic cleanup on unmount
- Connection status tracking via `realtimeStore`

---

## 9. Search Performance

### 9.1 Fuse.js Fuzzy Search

The global search uses Fuse.js for efficient fuzzy matching:

```typescript
import { useGlobalSearch } from '@/components/search/useGlobalSearch';
```

### 9.2 Search History

Search history is managed with size limits:

```typescript
import { searchHistoryManager } from '@/lib/utils/searchHistory';
```

---

## 10. Request Queue

### 10.1 Rate-Limited Request Queue

API requests are managed through a request queue:

```typescript
import { requestQueue } from '@/lib/utils/requestQueue';
```

This prevents overwhelming external APIs with too many concurrent requests.

---

## 11. Performance Monitoring

### 11.1 Web Vitals

The application tracks Core Web Vitals:

```typescript
import {
  initWebVitals,
  onMetric,
  reportCustomMetric,
  getPerformanceScore,
} from '@/lib/monitoring/webVitals';
import { PERFORMANCE_THRESHOLDS } from '@/lib/monitoring/webVitals';
```

**Tracked metrics:**

- LCP (Largest Contentful Paint) - threshold: 2500ms/4000ms
- INP (Interaction to Next Paint) - threshold: 200ms/500ms
- CLS (Cumulative Layout Shift) - threshold: 0.1/0.25
- FCP (First Contentful Paint) - threshold: 1800ms/3000ms
- TTFB (Time to First Byte) - threshold: 800ms/1800ms

### 11.2 Performance Metrics Collector

The `PerformanceMetricsCollector` component initializes monitoring:

```typescript
import PerformanceMetricsCollector from '@/components/PerformanceMetricsCollector';
```

### 11.3 Sentry Integration

Error tracking and performance monitoring via Sentry:

```typescript
import { captureException, setUser, addBreadcrumb } from '@/lib/monitoring';
```

---

## 12. Virtualization

### 12.1 TanStack Virtual

The application uses `@tanstack/react-virtual` for efficient rendering of large lists:

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';
```

This is used in data tables and long list views where rendering all items would be expensive.

---

## 13. Image and Asset Optimization

### 13.1 Token Icons

Token icons are loaded from the public directory with lazy loading:

```typescript
import TokenIcon from '@/app/price-query/components/TokenIcon';
```

### 13.2 Logo Assets

Oracle and crypto logos are stored in `public/logos/` for static serving.

---

## 14. Bundle Optimization

### 14.1 Dynamic Imports

Heavy components are loaded dynamically using Next.js `dynamic()`:

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <ChartSkeleton />,
  ssr: false,
});
```

### 14.2 Tree Shaking

The codebase uses named imports and barrel exports to enable effective tree shaking:

```typescript
export { Button } from './Button';
export { LiveStatusBar } from './LiveStatusBar';
export { DataTablePro } from './DataTablePro';
```

---

## 15. Security Performance

### 15.1 Input Sanitization

DOMPurify is used for efficient HTML sanitization:

```typescript
import { sanitizeInput } from '@/lib/security/inputSanitizer';
```

### 15.2 XSS Prevention

XSS filtering is applied at the middleware level:

```typescript
import { filterXSS } from '@/lib/security/xss';
```

### 15.3 CSRF Protection

CSRF tokens are validated at the API layer:

```typescript
import { validateCSRFToken } from '@/lib/security/csrf';
```
