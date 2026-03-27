'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';

import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';

interface MetricData {
  id: string;
  label: {
    en: string;
    zh: string;
  };
  value: string;
  baseValue: number;
  unit: string;
  change: number;
  icon: React.ElementType;
  color: string;
  formatValue: (val: number) => string;
}

interface ChartPoint {
  index: number;
  value: number;
}

const generateInitialTrendData = (baseValue: number, variance: number): ChartPoint[] => {
  return Array.from({ length: 20 }, (_, i) => ({
    index: i,
    value: baseValue + Math.random() * variance - variance / 2,
  }));
};

const metricsConfig: Omit<MetricData, 'value' | 'change'>[] = [
  {
    id: 'tvs',
    label: { en: 'TVS', zh: 'TVS' },
    baseValue: 42.1,
    unit: 'B',
    icon: Shield,
    color: chartColors.chart.blue,
    formatValue: (val) => `$${val.toFixed(1)}B`,
  },
  {
    id: 'oracles',
    label: { en: 'Active Oracles', zh: '活跃预言机' },
    baseValue: 5,
    unit: '',
    icon: Activity,
    color: chartColors.chart.emerald,
    formatValue: (val) => Math.round(val).toString(),
  },
  {
    id: 'pairs',
    label: { en: 'Supported Pairs', zh: '支持交易对' },
    baseValue: 1200,
    unit: '+',
    icon: BarChart3,
    color: chartColors.chart.violet,
    formatValue: (val) => `${Math.round(val)}+`,
  },
  {
    id: 'api',
    label: { en: 'API Calls', zh: 'API 调用' },
    baseValue: 2.4,
    unit: 'M',
    icon: Zap,
    color: chartColors.chart.amber,
    formatValue: (val) => `${val.toFixed(1)}M`,
  },
  {
    id: 'accuracy',
    label: { en: 'Accuracy', zh: '准确率' },
    baseValue: 99.97,
    unit: '%',
    icon: TrendingUp,
    color: chartColors.chart.emerald,
    formatValue: (val) => `${val.toFixed(2)}%`,
  },
  {
    id: 'response',
    label: { en: 'Response Time', zh: '响应时间' },
    baseValue: 245,
    unit: 'ms',
    icon: Clock,
    color: chartColors.chart.cyan,
    formatValue: (val) => `${Math.round(val)}ms`,
  },
];

function MiniAreaChart({ 
  data, 
  color, 
  isPositive 
}: { 
  data: ChartPoint[]; 
  color: string;
  isPositive: boolean;
}) {
  const chartColor = isPositive ? semanticColors.success.DEFAULT : semanticColors.danger.DEFAULT;
  
  return (
    <div className="h-10 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${data[0]?.index || 0}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={chartColor}
            strokeWidth={1.5}
            fill={`url(#gradient-${data[0]?.index || 0})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function PulseDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: semanticColors.success.DEFAULT }}
      />
      <span
        className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: semanticColors.success.DEFAULT }}
      />
    </span>
  );
}

export default function LiveMetricsPanel() {
  const locale = useLocale();
  const [metrics, setMetrics] = useState<MetricData[]>(() => 
    metricsConfig.map(m => ({
      ...m,
      value: m.formatValue(m.baseValue),
      change: (Math.random() - 0.3) * 5, // -1.5% to +3.5%
    }))
  );
  
  const [trendData, setTrendData] = useState<Record<string, ChartPoint[]>>(() => {
    const initial: Record<string, ChartPoint[]> = {};
    metricsConfig.forEach(m => {
      initial[m.id] = generateInitialTrendData(m.baseValue, m.baseValue * 0.02);
    });
    return initial;
  });

  const updateMetrics = useCallback(() => {
    setMetrics(prevMetrics => 
      prevMetrics.map(metric => {
        const variance = metric.baseValue * 0.005; // 0.5% variance
        const newBaseValue = metric.baseValue + (Math.random() - 0.5) * variance;
        const newChange = metric.change + (Math.random() - 0.5) * 0.5;
        
        return {
          ...metric,
          baseValue: newBaseValue,
          value: metric.formatValue(newBaseValue),
          change: newChange,
        };
      })
    );

    setTrendData(prev => {
      const updated: Record<string, ChartPoint[]> = {};
      Object.keys(prev).forEach(key => {
        const currentData = prev[key];
        const metric = metricsConfig.find(m => m.id === key);
        if (metric) {
          const newValue = metric.baseValue + (Math.random() - 0.5) * metric.baseValue * 0.02;
          const newData = [...currentData.slice(1), { index: Date.now(), value: newValue }];
          updated[key] = newData;
        }
      });
      return updated;
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, 5000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const isZh = isChineseLocale(locale);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PulseDot />
          <span className="text-sm font-medium" style={{ color: baseColors.gray[600] }}>
            {isZh ? '实时指标' : 'Live Metrics'}
          </span>
        </div>
        <span className="text-xs" style={{ color: baseColors.gray[400] }}>
          {isZh ? '每 5 秒更新' : 'Updates every 5s'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-0">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isPositive = metric.change >= 0;
          const trendDataForMetric = trendData[metric.id] || [];
          
          return (
            <div
              key={metric.id}
              className={`
                relative px-4 py-5
                ${index < metrics.length - 1 ? 'border-r border-gray-100' : ''}
                ${index < metrics.length - (metrics.length % 2 === 0 ? 3 : 4) ? 'lg:border-b-0' : ''}
                ${index < 3 ? 'lg:border-b lg:border-gray-100' : ''}
                ${index % 2 === 0 ? 'border-r border-gray-100' : 'border-r-0'}
                lg:border-r lg:border-gray-100
                ${index === 2 || index === 5 ? 'lg:border-r-0' : ''}
                xl:border-r xl:border-gray-100
                ${index === 5 ? 'xl:border-r-0' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="p-1.5 rounded"
                    style={{ backgroundColor: `${metric.color}15` }}
                  >
                    <Icon 
                      className="w-4 h-4" 
                      style={{ color: metric.color }}
                    />
                  </div>
                </div>
                
                {/* Mini Chart */}
                <MiniAreaChart 
                  data={trendDataForMetric} 
                  color={metric.color}
                  isPositive={isPositive}
                />
              </div>

              <div className="mt-3">
                <div 
                  className="text-xs font-medium mb-1"
                  style={{ color: baseColors.gray[500] }}
                >
                  {isZh ? metric.label.zh : metric.label.en}
                </div>
                
                <div className="flex items-baseline gap-2">
                  <span 
                    className="text-xl font-bold"
                    style={{ color: baseColors.gray[900] }}
                  >
                    {metric.value}
                  </span>
                  
                  <div 
                    className="flex items-center gap-0.5 text-xs font-medium"
                    style={{ 
                      color: isPositive 
                        ? semanticColors.success.DEFAULT 
                        : semanticColors.danger.DEFAULT 
                    }}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>
                      {isPositive ? '+' : ''}
                      {metric.change.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
