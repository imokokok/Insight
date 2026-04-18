# Performance Monitoring Documentation

## Overview

The Insight Oracle Data Analytics Platform includes performance monitoring capabilities through Web Vitals tracking, Sentry error reporting, and Vercel Analytics integration.

---

## 1. Web Vitals Monitoring

### 1.1 Implementation

The web vitals monitoring system is implemented in `src/lib/monitoring/webVitals.ts`:

```typescript
import {
  initWebVitals,
  onMetric,
  reportMetric,
  reportCustomMetric,
  getPerformanceScore,
  PERFORMANCE_THRESHOLDS,
} from '@/lib/monitoring/webVitals';

import type { WebVitalMetric, MetricName } from '@/lib/monitoring/webVitals';
```

### 1.2 Tracked Metrics

| Metric | Description               | Good    | Needs Improvement | Poor    |
| ------ | ------------------------- | ------- | ----------------- | ------- |
| LCP    | Largest Contentful Paint  | ≤2500ms | ≤4000ms           | >4000ms |
| INP    | Interaction to Next Paint | ≤200ms  | ≤500ms            | >500ms  |
| CLS    | Cumulative Layout Shift   | ≤0.1    | ≤0.25             | >0.25   |
| FCP    | First Contentful Paint    | ≤1800ms | ≤3000ms           | >3000ms |
| TTFB   | Time to First Byte        | ≤800ms  | ≤1800ms           | >1800ms |

### 1.3 Metric Handler Registration

Register handlers to process metric data:

```typescript
const unsubscribe = onMetric((metric: WebVitalMetric) => {
  console.log(`${metric.name}: ${metric.value} (${metric.rating})`);
});

unsubscribe();
```

### 1.4 Manual Metric Reporting

Report custom metrics manually:

```typescript
reportMetric(metric: WebVitalMetric);
reportCustomMetric(name: string, value: number);
```

### 1.5 Performance Score

Get an overall performance score:

```typescript
const { score, metrics } = getPerformanceScore();
```

### 1.6 Initialization

Web Vitals are initialized in the `PerformanceMetricsCollector` component:

```typescript
import PerformanceMetricsCollector from '@/components/PerformanceMetricsCollector';
```

This component calls `initWebVitals()` which sets up listeners for all Core Web Vitals using the `web-vitals` library.

---

## 2. Monitoring Module Exports

The monitoring barrel export (`src/lib/monitoring/index.ts`) provides:

```typescript
export {
  initWebVitals,
  onMetric,
  reportMetric,
  reportCustomMetric,
  getPerformanceScore,
  PERFORMANCE_THRESHOLDS,
} from './webVitals';

export type { WebVitalMetric, MetricName } from './webVitals';

export { captureException, setUser, addBreadcrumb } from './index';
```

---

## 3. Sentry Integration

### 3.1 Error Tracking

Sentry is integrated for error tracking and performance monitoring:

```typescript
import { captureException, setUser, addBreadcrumb } from '@/lib/monitoring';
```

**Usage:**

```typescript
try {
  await riskyOperation();
} catch (error) {
  captureException(error);
}
```

### 3.2 User Context

Set user context for error tracking:

```typescript
setUser({ id: userId, email: userEmail });
```

### 3.3 Breadcrumbs

Add breadcrumbs for debugging:

```typescript
addBreadcrumb({
  category: 'oracle',
  message: `Fetching price for ${symbol}`,
  level: 'info',
});
```

---

## 4. Vercel Analytics

### 4.1 Web Vitals Reporting

Web Vitals metrics are reported to Vercel Analytics automatically when the `@vercel/analytics` package is available:

```typescript
import { sendAnalyticsEvent } from '@vercel/analytics';
```

---

## 5. Oracle Performance Metrics

### 5.1 Performance Metrics Calculator

Oracle-specific performance metrics are calculated in `src/lib/oracles/utils/performanceMetricsCalculator.ts`:

```typescript
import { calculatePerformanceMetrics } from '@/lib/oracles/utils/performanceMetricsCalculator';
```

### 5.2 Performance Metrics Configuration

Metrics configuration is defined in `src/lib/oracles/utils/performanceMetricsConfig.ts`:

```typescript
import { performanceMetricsConfig } from '@/lib/oracles/utils/performanceMetricsConfig';
```

---

## 6. Real-time Connection Monitoring

### 6.1 Connection Status

The `realtimeStore` tracks WebSocket connection status:

```typescript
import { useRealtimeStore, useConnectionStatus } from '@/stores/realtimeStore';

function ConnectionMonitor() {
  const connectionStatus = useConnectionStatus();
  // 'connected' | 'disconnected' | 'connecting'
}
```

### 6.2 Connection Status Component

The `ConnectionStatus` component displays real-time connection status:

```typescript
import { ConnectionStatus } from '@/components/realtime/ConnectionStatus';
```

---

## 7. Data Freshness Monitoring

### 7.1 Last Updated Tracking

The `useLastUpdated` hook tracks when data was last refreshed:

```typescript
import { useLastUpdated } from '@/hooks/oracles/useLastUpdated';
```

### 7.2 Auto-Refresh Status

The auto-refresh system tracks refresh status:

```typescript
import { useAutoRefresh } from '@/hooks/useAutoRefresh';

const { lastUpdated, isRefreshing, refresh } = useAutoRefresh({ ... });
```

---

## 8. Oracle Data Quality Monitoring

### 8.1 On-Chain Data Hooks

Provider-specific on-chain data hooks monitor data quality:

| Hook                       | Provider  |
| -------------------------- | --------- |
| `useAllOnChainData`        | All       |
| `useOnChainDataByProvider` | Any       |
| `useDIAOnChainData`        | DIA       |
| `useFlareOnChainData`      | Flare     |
| `useRedStoneOnChainData`   | RedStone  |
| `useReflectorOnChainData`  | Reflector |
| `useSupraOnChainData`      | Supra     |
| `useTwapOnChainData`       | TWAP      |
| `useWINkLinkOnChainData`   | WINkLink  |

### 8.2 Data Source Transparency

Data source indicators show where data comes from:

```typescript
import {
  DataSourceIndicator,
  DataSourceList,
  DataUpdateTime,
} from '@/components/data-transparency';
```

---

## 9. Cross-Chain Data Monitoring

### 9.1 Cross-Chain Data Store

The `crossChainDataStore` tracks data loading and refresh status:

```typescript
import { useCrossChainDataStore } from '@/stores/crossChainDataStore';

const { loading, refreshStatus, showRefreshSuccess, lastUpdated, anomalies } =
  useCrossChainDataStore();
```

**Refresh statuses:**

- `idle` - No refresh in progress
- `refreshing` - Refresh in progress
- `success` - Refresh completed successfully
- `error` - Refresh failed

### 9.2 Anomaly Detection

Anomalies are tracked in the cross-chain data store:

```typescript
const { anomalies } = useCrossChainDataStore();
```

---

## 10. API Performance Monitoring

### 10.1 Logging Middleware

API request/response logging is handled by the logging middleware:

```typescript
import { createLoggingMiddleware } from '@/lib/api/middleware/loggingMiddleware';
```

### 10.2 Rate Limiting

API rate limiting is tracked via the rate limit store:

```typescript
import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
```

### 10.3 Enhanced Retry

The enhanced retry mechanism tracks retry attempts:

```typescript
import { enhancedRetry } from '@/lib/api/retry/enhancedRetry';
```
