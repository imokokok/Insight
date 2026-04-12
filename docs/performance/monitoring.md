# Insight Performance Monitoring Guide

> This guide introduces how to use the performance monitoring tools and APIs of the Insight platform.

## Table of Contents

1. [Overview](#overview)
2. [Web Vitals Monitoring](#web-vitals-monitoring)
3. [Performance Hooks](#performance-hooks)
4. [Performance Monitoring Components](#performance-monitoring-components)
5. [Real-time Monitoring](#real-time-monitoring)
6. [Performance Reports](#performance-reports)
7. [Alert Configuration](#alert-configuration)

---

## Overview

Insight platform provides a comprehensive performance monitoring solution, including:

- **Web Vitals Monitoring**: Automatic collection of Core Web Vitals metrics (LCP, INP, CLS, FCP, TTFB)
- **Custom Performance Tracking**: Track performance of business-critical operations
- **Resource Monitoring**: Monitor network requests and resource loading
- **Memory Monitoring**: Track JavaScript heap memory usage
- **Real-time Monitoring Dashboard**: Visualize performance metrics
- **Integrated Monitoring Services**: Support for Vercel Analytics, Speed Insights, and Sentry

---

## Web Vitals Monitoring

### 1. Automatic Collection

The project has integrated automatic Web Vitals collection through `src/lib/monitoring/webVitals.ts`:

```typescript
import { initWebVitals, onMetric, reportCustomMetric } from '@/lib/monitoring/webVitals';

// Initialize Web Vitals monitoring
initWebVitals();

// Subscribe to metrics
const unsubscribe = onMetric((metric) => {
  console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
});

// Report custom metric
reportCustomMetric('custom-metric', 150);
```

### 2. Metric Thresholds

The project defines precise performance thresholds:

```typescript
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};
```

### 3. Metric Threshold Table

| Metric | Good    | Needs Improvement | Poor    |
| ------ | ------- | ----------------- | ------- |
| LCP    | ≤ 2.5s  | ≤ 4.0s            | > 4.0s  |
| INP    | ≤ 200ms | ≤ 500ms           | > 500ms |
| CLS    | ≤ 0.1   | ≤ 0.25            | > 0.25  |
| FCP    | ≤ 1.8s  | ≤ 3.0s            | > 3.0s  |
| TTFB   | ≤ 800ms | ≤ 1.8s            | > 1.8s  |

---

## Performance Hooks

### 1. usePerformanceTracker

Track performance of specific operations:

```typescript
import { usePerformanceTracker } from '@/hooks';

function PriceFetcher() {
  const tracker = usePerformanceTracker('fetch-price-history');

  const fetchData = async () => {
    // Method 1: Manual tracking
    tracker.start();
    try {
      const data = await fetchPriceHistory(symbol);
      return data;
    } finally {
      tracker.end({ symbol, chain });
    }

    // Method 2: Using measureAsync
    return tracker.measureAsync(
      () => fetchPriceHistory(symbol),
      { symbol, chain }
    );
  };

  return <button onClick={fetchData}>Fetch</button>;
}
```

### 2. useComponentPerformance

Monitor component rendering performance:

```typescript
import { useComponentPerformance } from '@/hooks';

function HeavyChart({ data }) {
  const { metrics, markUpdate } = useComponentPerformance('HeavyChart');

  useEffect(() => {
    if (metrics?.renderCount > 10) {
      console.warn('HeavyChart rendered too many times');
    }
  }, [metrics]);

  const handleDataUpdate = () => {
    markUpdate(); // Mark data update
    updateChartData();
  };

  return <Chart data={data} onUpdate={handleDataUpdate} />;
}
```

### 3. useResourceOptimizer

Monitor resource loading:

```typescript
import { useResourceOptimizer } from '@/hooks';

function ResourceMonitor() {
  const { resources, slowResources, totalSize } = useResourceOptimizer();

  return (
    <div>
      <div>Total Resources: {resources.length}</div>
      <div>Slow Resources: {slowResources.length}</div>
      <div>Total Size: {(totalSize / 1024 / 1024).toFixed(2)} MB</div>

      {slowResources.length > 0 && (
        <Alert>
          Found {slowResources.length} slow resources
        </Alert>
      )}
    </div>
  );
}
```

### 4. useMemoryOptimizer

Monitor memory usage:

```typescript
import { useMemoryOptimizer } from '@/hooks';

function MemoryMonitor() {
  const { memory, isHighUsage, isCritical, formatSize } = useMemoryOptimizer();

  useEffect(() => {
    if (isCritical) {
      // Clear cache
      clearOldCache();
      // Notify user
      showWarning('Memory usage is critical');
    }
  }, [isCritical]);

  if (!memory) return null;

  return (
    <div>
      <div>Used: {formatSize(memory.used)}</div>
      <div>Total: {formatSize(memory.total)}</div>
      <div>Limit: {formatSize(memory.limit)}</div>
      <Progress value={memory.percentage} max={100} />
    </div>
  );
}
```

### 5. useNavigationOptimizer

Analyze page navigation performance:

```typescript
import { useNavigationOptimizer } from '@/hooks';

function NavigationMonitor() {
  const { timing, bottleneck, isSlow } = useNavigationOptimizer();

  if (!timing) return null;

  return (
    <div>
      <div>DNS: {timing.dnsLookup}ms</div>
      <div>TCP: {timing.tcpConnection}ms</div>
      <div>Server: {timing.serverResponse}ms</div>
      <div>DOM: {timing.domProcessing}ms</div>
      <div>Resources: {timing.resourceLoading}ms</div>
      <div>Total: {timing.total}ms</div>

      {bottleneck && (
        <Alert type="warning">
          Bottleneck: {bottleneck.name} ({bottleneck.duration}ms)
        </Alert>
      )}
    </div>
  );
}
```

---

## Performance Monitoring Components

### 1. PerformanceMonitor

Visual performance monitoring panel:

```typescript
import { PerformanceMonitor } from '@/components/performance';

function App() {
  return (
    <>
      {/* Show in development environment */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor
          enabled={true}
          position="bottom-right"
          showDetails={true}
          onPerformanceIssue={(issue) => {
            console.error('Performance Issue:', issue);
            // Send to monitoring service
            sendToMonitoring(issue);
          }}
        />
      )}
      <MainContent />
    </>
  );
}
```

### 2. PerformanceBadge

Compact performance status indicator:

```typescript
import { PerformanceBadge } from '@/components/performance';

function Header() {
  return (
    <header className="flex items-center justify-between">
      <Logo />
      <PerformanceBadge />
    </header>
  );
}
```

### 3. PerformanceReportButton

Export performance report:

```typescript
import { PerformanceReportButton } from '@/components/performance';

function Settings() {
  return (
    <div>
      <h2>Performance</h2>
      <PerformanceReportButton />
    </div>
  );
}
```

---

## Real-time Monitoring

### 1. Real-time Performance Panel

```typescript
import { usePerformanceOptimizer } from '@/hooks';

function RealTimePerformancePanel() {
  const { webVitals, resources, memory, health, getReport } = usePerformanceOptimizer();

  const [history, setHistory] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const report = getReport();
      setHistory(prev => [...prev.slice(-50), report]);
    }, 5000);

    return () => clearInterval(interval);
  }, [getReport]);

  return (
    <div className="performance-panel">
      <div className="health-indicator">
        Health: <span className={health}>{health}</span>
      </div>

      <div className="metrics-grid">
        <MetricCard
          title="FCP"
          value={webVitals.metrics.fcp}
          unit="ms"
        />
        <MetricCard
          title="LCP"
          value={webVitals.metrics.lcp}
          unit="ms"
        />
        <MetricCard
          title="Memory"
          value={memory.memory?.percentage}
          unit="%"
        />
      </div>

      <PerformanceChart data={history} />
    </div>
  );
}
```

### 2. Long Task Monitoring

```typescript
import { useLongTaskMonitor } from '@/hooks';

function LongTaskWatcher() {
  const longTasks = useLongTaskMonitor(50); // 50ms threshold

  useEffect(() => {
    if (longTasks.length > 0) {
      const lastTask = longTasks[longTasks.length - 1];
      console.warn('Long task detected:', lastTask.duration, 'ms');
    }
  }, [longTasks]);

  return (
    <div>
      <div>Long Tasks: {longTasks.length}</div>
      {longTasks.slice(-5).map((task, i) => (
        <div key={i}>
          {task.name}: {task.duration.toFixed(0)}ms
        </div>
      ))}
    </div>
  );
}
```

---

## Performance Reports

### 1. Generate Report

```typescript
import { usePerformanceReport } from '@/hooks';

function ReportGenerator() {
  const { report, generateReport, reportOperation } = usePerformanceReport();

  const handleExport = () => {
    const newReport = generateReport();

    // Download report
    const blob = new Blob([JSON.stringify(newReport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${Date.now()}.json`;
    a.click();
  };

  return (
    <div>
      <button onClick={handleExport}>Export Report</button>
      {report && (
        <div>
          <div>Timestamp: {new Date(report.timestamp).toLocaleString()}</div>
          <div>URL: {report.url}</div>
          <div>Operations: {report.operations.length}</div>
        </div>
      )}
    </div>
  );
}
```

### 2. Report Structure

```typescript
interface PerformanceReport {
  timestamp: number;
  url: string;
  webVitals: {
    fcp?: number;
    lcp?: number;
    inp?: number;
    cls?: number;
    ttfb?: number;
  };
  operations: Array<{
    name: string;
    duration: number;
    metadata?: Record<string, unknown>;
  }>;
  resources: {
    total: number;
    slow: number;
    totalSize: number;
  };
  memory?: {
    used: number;
    total: number;
    limit: number;
    percentage: number;
  };
  navigation?: {
    dnsLookup: number;
    tcpConnection: number;
    serverResponse: number;
    domProcessing: number;
    resourceLoading: number;
    total: number;
  };
  health: 'excellent' | 'good' | 'fair' | 'poor';
}
```

---

## Alert Configuration

### 1. Basic Alerts

```typescript
import { usePerformanceOptimizer } from '@/hooks';

function PerformanceAlerts() {
  const { webVitals, memory } = usePerformanceOptimizer();
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const newAlerts = [];

    if (webVitals.metrics.fcp && webVitals.metrics.fcp > 1800) {
      newAlerts.push({
        type: 'warning',
        message: `FCP is slow: ${webVitals.metrics.fcp.toFixed(0)}ms`,
      });
    }

    if (webVitals.metrics.lcp && webVitals.metrics.lcp > 2500) {
      newAlerts.push({
        type: 'error',
        message: `LCP is slow: ${webVitals.metrics.lcp.toFixed(0)}ms`,
      });
    }

    if (memory.isCritical) {
      newAlerts.push({
        type: 'critical',
        message: `Memory usage critical: ${memory.memory?.percentage.toFixed(1)}%`,
      });
    }

    setAlerts(newAlerts);
  }, [webVitals, memory]);

  return (
    <div className="alerts-container">
      {alerts.map((alert, i) => (
        <Alert key={i} type={alert.type}>
          {alert.message}
        </Alert>
      ))}
    </div>
  );
}
```

### 2. Sentry Integration

The project has integrated @sentry/nextjs for automatic performance data reporting:

```typescript
import * as Sentry from '@sentry/nextjs';
import { usePerformanceOptimizer } from '@/hooks';

function SentryIntegration() {
  const { webVitals, getReport } = usePerformanceOptimizer();

  useEffect(() => {
    // Report performance metrics to Sentry
    if (webVitals.metrics.lcp && webVitals.metrics.lcp > 4000) {
      Sentry.captureMessage('LCP exceeds threshold', {
        level: 'warning',
        extra: {
          lcp: webVitals.metrics.lcp,
          report: getReport(),
        },
      });
    }
  }, [webVitals, getReport]);

  return null;
}
```

### 3. Custom Monitoring Service

```typescript
import { usePerformanceOptimizer } from '@/hooks';

function CustomMonitoring() {
  const performance = usePerformanceOptimizer();

  useEffect(() => {
    const interval = setInterval(() => {
      const report = performance.getReport();

      // Send to custom monitoring service
      fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    }, 30000); // Report every 30 seconds

    return () => clearInterval(interval);
  }, [performance]);

  return null;
}
```

---

## Integrated Monitoring Services

### Vercel Analytics

The project has integrated @vercel/analytics for automatic page view and conversion tracking:

```typescript
import { track } from '@vercel/analytics';

// Track custom events
track('web-vital', {
  name: 'LCP',
  value: 1500,
  rating: 'good',
});
```

### Vercel Speed Insights

The project has integrated @vercel/speed-insights for automatic performance data collection.

### Sentry

The project has integrated @sentry/nextjs for error tracking and performance monitoring:

```typescript
import * as Sentry from '@sentry/nextjs';

// Report custom metrics
Sentry.metrics.distribution('custom-metric', 150);
```

---

## Best Practices

### 1. Monitoring Scope

- **Development Environment**: Enable all monitoring for debugging
- **Test Environment**: Enable performance monitoring to collect baseline data
- **Production Environment**: Enable lightweight monitoring to avoid performance overhead

### 2. Sampling Strategy

```typescript
// Sample 10% in production
const shouldMonitor = Math.random() < 0.1;

function App() {
  return (
    <>
      {shouldMonitor && <PerformanceMonitor />}
      <MainContent />
    </>
  );
}
```

### 3. Performance Budget

The project's configured performanceBudget:

```typescript
const PERFORMANCE_BUDGET = {
  webVitals: {
    LCP: { target: 2500, warning: 4000 },
    INP: { target: 200, warning: 500 },
    CLS: { target: 0.1, warning: 0.25 },
    FCP: { target: 1800, warning: 3000 },
    TTFB: { target: 800, warning: 1800 },
  },
  bundle: {
    javascript: { target: 300, warning: 500 },
    css: { target: 100, warning: 150 },
    images: { target: 500, warning: 1000 },
  },
  resources: {
    maxResourceCount: 50,
    maxThirdPartyScripts: 10,
    maxFonts: 5,
  },
};
```

### 4. User Perception

```typescript
// Only show warning when performance issues affect user experience
function UserFacingPerformanceAlert() {
  const { webVitals } = usePerformanceOptimizer();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Only show user warning when LCP > 4s
    if (webVitals.metrics.lcp && webVitals.metrics.lcp > 4000) {
      setShowAlert(true);
    }
  }, [webVitals]);

  if (!showAlert) return null;

  return (
    <Alert closable onClose={() => setShowAlert(false)}>
      This page is loading slowly. Please check your connection.
    </Alert>
  );
}
```

---

## Summary

Insight platform provides comprehensive performance monitoring capabilities:

1. **Automatic Monitoring**: Web Vitals automatic collection (LCP, INP, CLS, FCP, TTFB)
2. **Custom Tracking**: Flexible performance tracking API
3. **Real-time Monitoring**: Visual monitoring dashboard
4. **Alert Mechanism**: Configurable alert rules
5. **Report Export**: Detailed performance reports
6. **Third-party Integration**: Vercel Analytics, Speed Insights, Sentry

By using these tools appropriately, you can continuously optimize application performance and improve user experience.
