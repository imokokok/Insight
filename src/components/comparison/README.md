# 数据对比功能组件库

## 概述

数据对比功能组件库提供了一套完整的对比分析解决方案，支持三种主要对比模式：

1. **时间段对比** - 对比不同时间段的数据变化
2. **多预言机对比** - 并排显示多个预言机的数据差异
3. **行业基准对比** - 与行业平均水平或市场领导者对比

## 组件列表

### TimeRangeSelector
时间段选择器组件，支持预设时间段和自定义时间范围。

```tsx
import { TimeRangeSelector } from '@/components/comparison';

<TimeRangeSelector
  value={timeConfig}
  onChange={(config) => setTimeConfig(config)}
  maxCustomRangeDays={365}
/>
```

### TimeComparisonChart
时间段对比图表组件，展示两个时间段的数据对比。

```tsx
import { TimeComparisonChart } from '@/components/comparison';

<TimeComparisonChart
  data={comparisonData}
  title="价格趋势对比"
  showDifference={true}
  valueFormatter={(v) => `$${v.toFixed(2)}`}
/>
```

### OracleComparisonView
多预言机对比视图组件，展示多个预言机的详细对比。

```tsx
import { OracleComparisonView } from '@/components/comparison';

<OracleComparisonView
  oracles={oracleData}
  benchmarkOracle={OracleProvider.CHAINLINK}
  showCharts={true}
  showRadar={true}
  showTable={true}
/>
```

### BenchmarkComparison
行业基准对比组件，与行业基准数据进行对比分析。

```tsx
import { BenchmarkComparison } from '@/components/comparison';

<BenchmarkComparison
  actualValue={currentPrice}
  benchmarkType="industry_average"
  metrics={[
    { name: '响应时间', value: 350, benchmark: 500, unit: 'ms' },
    { name: '准确率', value: 99.8, benchmark: 99.5, unit: '%' },
  ]}
  invertColors={false}
/>
```

### DifferenceBadge
差异高亮徽章组件，用于显示数值差异。

```tsx
import { DifferenceBadge } from '@/components/comparison';

<DifferenceBadge
  value={2.5}
  type="percentage"
  threshold={{ low: 0.5, medium: 1.0, high: 2.0 }}
  showIcon={true}
/>
```

## 类型定义

```typescript
import {
  TimeRange,
  TimePeriod,
  TimeComparisonConfig,
  OracleComparisonItem,
  OracleMetrics,
  BenchmarkType,
  BenchmarkData,
  ComparisonMode,
  DifferenceSeverity,
} from '@/components/comparison';
```

## 颜色编码规范

### 差异颜色
- **正向（绿色）**: 表示优于基准或上涨
- **负向（红色）**: 表示低于基准或下跌
- **中性（灰色）**: 表示持平或无显著差异

### 严重程度
- **Critical（深红）**: > 2% 差异
- **High（橙红）**: 1% - 2% 差异
- **Medium（黄色）**: 0.5% - 1% 差异
- **Low（蓝色）**: 0.1% - 0.5% 差异
- **None（灰色）**: < 0.1% 差异

## 国际化

所有组件均支持国际化，使用 `next-intl` 进行文本管理。翻译键值位于：
- `comparison.timeRange.*` - 时间段选择器
- `comparison.timeComparison.*` - 时间对比图表
- `comparison.oracleComparison.*` - 预言机对比
- `comparison.benchmark.*` - 基准对比
- `comparison.difference.*` - 差异显示

## 使用示例

### 完整对比面板

```tsx
'use client';

import { useState } from 'react';
import {
  TimeRangeSelector,
  TimeComparisonChart,
  OracleComparisonView,
  BenchmarkComparison,
  TimeComparisonConfig,
  OracleComparisonItem,
} from '@/components/comparison';
import { OracleProvider } from '@/types/oracle';

export default function ComparisonDashboard() {
  const [timeConfig, setTimeConfig] = useState<TimeComparisonConfig>({
    primaryPeriod: {
      id: 'primary',
      label: '当前周期',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(),
      range: '24h',
    },
    comparisonPeriod: {
      id: 'comparison',
      label: '对比周期',
      startDate: new Date(Date.now() - 48 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      range: '24h',
    },
    comparisonType: 'previous',
  });

  const oracleData: OracleComparisonItem[] = [
    {
      provider: OracleProvider.CHAINLINK,
      name: 'Chainlink',
      color: '#2563EB',
      metrics: {
        price: 65000,
        timestamp: Date.now(),
        confidence: 0.98,
        responseTime: 350,
        deviation: 0.2,
        accuracy: 99.5,
        reliability: 99.9,
      },
    },
    // ... 更多预言机数据
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2>时间段对比</h2>
        <TimeRangeSelector
          value={timeConfig}
          onChange={setTimeConfig}
        />
      </section>

      <section>
        <h2>预言机对比</h2>
        <OracleComparisonView
          oracles={oracleData}
          showCharts={true}
          showTable={true}
        />
      </section>

      <section>
        <h2>行业基准对比</h2>
        <BenchmarkComparison
          actualValue={65000}
          benchmarkType="industry_average"
        />
      </section>
    </div>
  );
}
```

## 依赖

- React 19+
- Recharts
- date-fns
- next-intl
- Tailwind CSS
