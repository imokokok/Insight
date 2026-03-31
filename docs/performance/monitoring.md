# Insight 性能监控指南

> 本指南介绍如何使用 Insight 平台的性能监控工具和 API。

## 目录

1. [概述](#概述)
2. [Web Vitals 监控](#web-vitals-监控)
3. [性能 Hooks](#性能-hooks)
4. [性能监控组件](#性能监控组件)
5. [实时监控](#实时监控)
6. [性能报告](#性能报告)
7. [告警配置](#告警配置)

---

## 概述

Insight 平台提供全面的性能监控解决方案，包括：

- **Web Vitals 监控**: 自动收集 Core Web Vitals 指标 (LCP, INP, CLS, FCP, TTFB)
- **自定义性能追踪**: 追踪业务关键操作的性能
- **资源监控**: 监控网络请求和资源加载
- **内存监控**: 追踪 JavaScript 堆内存使用
- **实时监控面板**: 可视化展示性能指标
- **集成监控服务**: 支持 Vercel Analytics、Speed Insights 和 Sentry

---

## Web Vitals 监控

### 1. 自动收集

项目已自动集成 Web Vitals 收集，通过 `src/lib/monitoring/webVitals.ts` 实现：

```typescript
import { initWebVitals, onMetric, reportCustomMetric } from '@/lib/monitoring/webVitals';

// 初始化 Web Vitals 监控
initWebVitals();

// 订阅指标
const unsubscribe = onMetric((metric) => {
  console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
});

// 上报自定义指标
reportCustomMetric('custom-metric', 150);
```

### 2. 指标阈值

项目定义了精确的性能阈值：

```typescript
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};
```

### 3. 指标阈值表

| 指标 | 良好    | 需改进  | 差      |
| ---- | ------- | ------- | ------- |
| LCP  | ≤ 2.5s  | ≤ 4.0s  | > 4.0s  |
| INP  | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS  | ≤ 0.1   | ≤ 0.25  | > 0.25  |
| FCP  | ≤ 1.8s  | ≤ 3.0s  | > 3.0s  |
| TTFB | ≤ 800ms | ≤ 1.8s  | > 1.8s  |

---

## 性能 Hooks

### 1. usePerformanceTracker

追踪特定操作的性能：

```typescript
import { usePerformanceTracker } from '@/hooks';

function PriceFetcher() {
  const tracker = usePerformanceTracker('fetch-price-history');

  const fetchData = async () => {
    // 方式 1: 手动追踪
    tracker.start();
    try {
      const data = await fetchPriceHistory(symbol);
      return data;
    } finally {
      tracker.end({ symbol, chain });
    }

    // 方式 2: 使用 measureAsync
    return tracker.measureAsync(
      () => fetchPriceHistory(symbol),
      { symbol, chain }
    );
  };

  return <button onClick={fetchData}>Fetch</button>;
}
```

### 2. useComponentPerformance

监控组件渲染性能：

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
    markUpdate(); // 标记数据更新
    updateChartData();
  };

  return <Chart data={data} onUpdate={handleDataUpdate} />;
}
```

### 3. useResourceOptimizer

监控资源加载：

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

监控内存使用：

```typescript
import { useMemoryOptimizer } from '@/hooks';

function MemoryMonitor() {
  const { memory, isHighUsage, isCritical, formatSize } = useMemoryOptimizer();

  useEffect(() => {
    if (isCritical) {
      // 清理缓存
      clearOldCache();
      // 通知用户
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

分析页面导航性能：

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

## 性能监控组件

### 1. PerformanceMonitor

可视化性能监控面板：

```typescript
import { PerformanceMonitor } from '@/components/performance';

function App() {
  return (
    <>
      {/* 开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <PerformanceMonitor
          enabled={true}
          position="bottom-right"
          showDetails={true}
          onPerformanceIssue={(issue) => {
            console.error('Performance Issue:', issue);
            // 发送到监控服务
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

简洁的性能状态指示器：

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

导出性能报告：

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

## 实时监控

### 1. 实时性能面板

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

### 2. 长任务监控

```typescript
import { useLongTaskMonitor } from '@/hooks';

function LongTaskWatcher() {
  const longTasks = useLongTaskMonitor(50); // 50ms 阈值

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

## 性能报告

### 1. 生成报告

```typescript
import { usePerformanceReport } from '@/hooks';

function ReportGenerator() {
  const { report, generateReport, reportOperation } = usePerformanceReport();

  const handleExport = () => {
    const newReport = generateReport();

    // 下载报告
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

### 2. 报告结构

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

## 告警配置

### 1. 基础告警

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

### 2. 集成 Sentry

项目已集成 @sentry/nextjs，可自动上报性能数据：

```typescript
import * as Sentry from '@sentry/nextjs';
import { usePerformanceOptimizer } from '@/hooks';

function SentryIntegration() {
  const { webVitals, getReport } = usePerformanceOptimizer();

  useEffect(() => {
    // 上报性能指标到 Sentry
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

### 3. 自定义监控服务

```typescript
import { usePerformanceOptimizer } from '@/hooks';

function CustomMonitoring() {
  const performance = usePerformanceOptimizer();

  useEffect(() => {
    const interval = setInterval(() => {
      const report = performance.getReport();

      // 发送到自定义监控服务
      fetch('/api/monitoring/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
    }, 30000); // 每 30 秒上报一次

    return () => clearInterval(interval);
  }, [performance]);

  return null;
}
```

---

## 集成监控服务

### Vercel Analytics

项目已集成 @vercel/analytics，自动追踪页面访问和转化：

```typescript
import { track } from '@vercel/analytics';

// 追踪自定义事件
track('web-vital', {
  name: 'LCP',
  value: 1500,
  rating: 'good',
});
```

### Vercel Speed Insights

项目已集成 @vercel/speed-insights，自动收集性能数据。

### Sentry

项目已集成 @sentry/nextjs，支持错误追踪和性能监控：

```typescript
import * as Sentry from '@sentry/nextjs';

// 上报自定义指标
Sentry.metrics.distribution('custom-metric', 150);
```

---

## 最佳实践

### 1. 监控范围

- **开发环境**: 启用所有监控，便于调试
- **测试环境**: 启用性能监控，收集基准数据
- **生产环境**: 启用轻量级监控，避免性能开销

### 2. 采样策略

```typescript
// 生产环境采样 10%
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

### 3. 性能预算

项目配置的 performanceBudget 如下：

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

### 4. 用户感知

```typescript
// 只在性能问题影响用户体验时显示警告
function UserFacingPerformanceAlert() {
  const { webVitals } = usePerformanceOptimizer();
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // 只在 LCP > 4s 时显示用户警告
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

## 总结

Insight 平台提供全面的性能监控能力：

1. **自动监控**: Web Vitals 自动收集 (LCP, INP, CLS, FCP, TTFB)
2. **自定义追踪**: 灵活的性能追踪 API
3. **实时监控**: 可视化监控面板
4. **告警机制**: 可配置的告警规则
5. **报告导出**: 详细的性能报告
6. **第三方集成**: Vercel Analytics、Speed Insights、Sentry

通过合理使用这些工具，可以持续优化应用性能，提升用户体验。
