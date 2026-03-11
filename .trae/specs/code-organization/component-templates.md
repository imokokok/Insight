# 组件代码模板

## 1. 通用组件模板

### 1.1 基础组件

```tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';

interface ComponentNameProps {
  /** 附加的CSS类名 */
  className?: string;
  /** 回调函数 */
  onAction?: (value: string) => void;
  /** 数据源 */
  data?: DataType[];
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 组件描述
 * 
 * @example
 * ```tsx
 * <ComponentName 
 *   data={data}
 *   onAction={(value) => console.log(value)}
 * />
 * ```
 */
export function ComponentName({
  className = '',
  onAction,
  data = [],
  disabled = false,
}: ComponentNameProps) {
  const { t } = useI18n();
  const [internalState, setInternalState] = useState<string>('');

  const computedValue = useMemo(() => {
    return data.map(item => transform(item));
  }, [data]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    onAction?.(internalState);
  }, [disabled, onAction, internalState]);

  return (
    <div className={`component-root ${className}`}>
      {/* component content */}
    </div>
  );
}
```

## 2. 图表组件模板

### 2.1 折线图组件

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { chartColors, formatPrice, formatTimestamp } from '@/lib/utils/chartSharedUtils';

interface PriceChartProps {
  data: ChartDataPoint[];
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  onPointClick?: (point: ChartDataPoint) => void;
}

interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export function PriceLineChart({
  data,
  height = 400,
  showGrid = true,
  showTooltip = true,
  onPointClick,
}: PriceChartProps) {
  const [activePoint, setActivePoint] = useState<ChartDataPoint | null>(null);

  const formattedData = useMemo(() => {
    return data.map(point => ({
      ...point,
      time: formatTimestamp(point.timestamp, 'time'),
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const point = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-gray-500">{point.time}</p>
        <p className="text-sm font-semibold text-gray-900">
          {formatPrice(point.value)}
        </p>
      </div>
    );
  };

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formattedData}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={chartColors.grid} 
            />
          )}
          <XAxis 
            dataKey="time" 
            tick={{ fontSize: 11, fill: chartColors.text }}
            tickLine={false}
          />
          <YAxis 
            tick={{ fontSize: 11, fill: chartColors.text }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
          />
          {showTooltip && <Tooltip content={<CustomTooltip />} />}
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartColors.primary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColors.primary }}
            onClick={(_, index) => onPointClick?.(data[index])}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
```

## 3. 页面组件模板

### 3.1 Oracle页面

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { OraclePageTemplate } from '@/components/oracle/OraclePageTemplate';
import { TabNavigation, TabItem } from '@/components/oracle/TabNavigation';
import { PageHeader } from '@/components/oracle/PageHeader';
import { PriceChart } from '@/components/oracle/PriceChart';
import { NetworkStatsPanel } from '@/components/oracle/NetworkStatsPanel';
import { useI18n } from '@/lib/i18n/context';
import { OracleProvider } from '@/lib/types/oracleTypes';

type TabId = 'market' | 'network' | 'validators';

export default function ProviderPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<TabId>('market');

  const tabs: TabItem[] = [
    {
      id: 'market',
      label: t('provider.menu.marketData'),
      icon: <MarketIcon />,
    },
    {
      id: 'network',
      label: t('provider.menu.network'),
      icon: <NetworkIcon />,
    },
    {
      id: 'validators',
      label: t('provider.menu.validators'),
      icon: <ValidatorsIcon />,
    },
  ];

  return (
    <OraclePageTemplate>
      <PageHeader
        title={t('provider.title')}
        description={t('provider.description')}
      />
      
      <TabNavigation
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabId)}
        tabs={tabs}
      />

      <div className="mt-6">
        {activeTab === 'market' && <MarketContent />}
        {activeTab === 'network' && <NetworkContent />}
        {activeTab === 'validators' && <ValidatorsContent />}
      </div>
    </OraclePageTemplate>
  );
}

function MarketContent() {
  return (
    <div className="space-y-6">
      <PriceChart />
    </div>
  );
}
```

## 4. Hook 模板

### 4.1 数据获取 Hook

```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseDataOptions {
  provider: string;
  symbol?: string;
  refreshInterval?: number;
}

interface UseDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number | null;
  refetch: () => Promise<void>;
}

export function useOracleData<T>({
  provider,
  symbol,
  refreshInterval,
}: UseDataOptions): UseDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchOracleData(provider, symbol);
      setData(result);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [provider, symbol]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!refreshInterval) return;

    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchData]);

  return {
    data,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchData,
  };
}
```

## 5. 工具函数模板

### 5.1 格式化函数

```typescript
/**
 * 格式化价格为美元字符串
 * 
 * @param price - 价格数值
 * @param decimals - 小数位数，默认4
 * @returns 格式化后的价格字符串
 * 
 * @example
 * formatPrice(1234.5678) // "$1,234.5678"
 * formatPrice(0.123456)  // "$0.1235"
 */
export function formatPrice(price: number, decimals: number = 4): string {
  if (price >= 1000) {
    return `$${price.toLocaleString('zh-CN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `$${price.toFixed(decimals)}`;
}

/**
 * 格式化百分比变化
 * 
 * @param value - 百分比值
 * @param decimals - 小数位数，默认2
 * @returns 带符号的百分比字符串
 * 
 * @example
 * formatPercentage(5.25)  // "+5.25%"
 * formatPercentage(-3.1)  // "-3.10%"
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
```

## 6. 类型定义模板

### 6.1 数据类型

```typescript
/**
 * 验证者信息
 */
export interface Validator {
  /** 验证者ID */
  id: string;
  /** 验证者名称 */
  name: string;
  /** 可靠性评分 (0-100) */
  reliabilityScore: number;
  /** 延迟 (ms) */
  latency: number;
  /** 状态 */
  status: PublisherStatus;
  /** 质押量 */
  staked: number;
  /** 所在区域 */
  region?: string;
  /** 在线时间百分比 */
  uptime?: number;
}

/**
 * 网络统计数据
 */
export interface NetworkStats {
  /** 活跃验证者数量 */
  activeValidators: number;
  /** 总验证者数量 */
  totalValidators: number;
  /** 平均响应时间 (ms) */
  avgResponseTime: number;
  /** 更新频率 (秒) */
  updateFrequency: number;
  /** 总质押量 */
  totalStaked: number;
  /** 数据时间戳 */
  timestamp: number;
}
```
