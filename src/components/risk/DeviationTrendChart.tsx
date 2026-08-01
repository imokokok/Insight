'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Calendar, Loader2 } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Button } from '@/components/ui';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { chartColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';
import { getDaysAgoUtc, getTodayUtc } from '@/lib/utils/date';
import { formatPrice } from '@/lib/utils/format';

interface DeviationTimelineBucket {
  timestamp: string;
  consensusPrice: number | null;
  providers: Record<string, { price: number; deviationPct: number | null }>;
}

interface DeviationApiResponse {
  symbol: string;
  dateRange: { from: string; to: string };
  providers: Array<{ provider: string }>;
  timeline: DeviationTimelineBucket[];
}

interface DeviationTrendChartProps {
  symbol: string;
  className?: string;
}

type RangeOption = { label: string; days: number };

const RANGE_OPTIONS: RangeOption[] = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

const LINE_COLORS = chartColors.sequence;

function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function DeviationTrendChart({ symbol, className }: DeviationTrendChartProps) {
  const [rangeDays, setRangeDays] = useState(7);
  const [data, setData] = useState<DeviationApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (days: number) => {
      setLoading(true);
      setError(null);
      try {
        const from = getDaysAgoUtc(days);
        const to = getTodayUtc();
        const response = await fetch(
          `/api/v1/deviation?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&interval=24h`
        );
        if (response.status === 401 || response.status === 403) {
          // Hide the chart entirely when the user is not authenticated for this endpoint.
          setData(null);
          return;
        }
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to load trend data');
        }
        setData(result.data as DeviationApiResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    },
    [symbol]
  );

  useEffect(() => {
    fetchData(rangeDays);
  }, [fetchData, rangeDays]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.timeline.map((bucket) => {
      const row: Record<string, number | string | null> = {
        timestamp: bucket.timestamp,
        consensusPrice: bucket.consensusPrice,
      };
      for (const [provider, point] of Object.entries(bucket.providers)) {
        row[provider] = point.deviationPct ?? 0;
      }
      return row;
    });
  }, [data]);

  const providerNames = useMemo(() => {
    if (!data) return [];
    return data.providers.map((p) => p.provider);
  }, [data]);

  const hasData = chartData.length > 0;

  // Hide the entire module when there is no usable data (auth error, network error, empty data).
  if (!loading && (error || !hasData)) {
    return null;
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden',
        className
      )}
    >
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            Deviation Trend
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Historical deviation across oracle providers vs consensus price
          </p>
        </div>
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <Button
              key={opt.days}
              variant={rangeDays === opt.days ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setRangeDays(opt.days)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {loading && !data && <ChartSkeleton height={280} variant="area" showToolbar={false} />}

        {hasData && (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 30, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatDateShort}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  minTickGap={24}
                />
                <YAxis
                  yAxisId="deviation"
                  tickFormatter={(v) => `${Number(v).toFixed(2)}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  label={{
                    value: 'Deviation %',
                    angle: -90,
                    position: 'insideLeft',
                    style: { fill: '#94a3b8', fontSize: 11 },
                  }}
                />
                <YAxis
                  yAxisId="price"
                  orientation="right"
                  tickFormatter={formatPrice}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  label={{
                    value: 'Consensus Price',
                    angle: 90,
                    position: 'insideRight',
                    style: { fill: '#94a3b8', fontSize: 11 },
                  }}
                />
                <ReferenceLine yAxisId="deviation" y={0} stroke="#94a3b8" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                  labelFormatter={(label) => formatDateShort(label as string)}
                  formatter={(value, name) => {
                    if (name === 'consensusPrice') {
                      return [formatPrice(Number(value)), 'Consensus Price'];
                    }
                    return [`${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(3)}%`, name];
                  }}
                />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="consensusPrice"
                  stroke="#94a3b8"
                  fill="#f1f5f9"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {providerNames.map((provider, idx) => (
                  <Line
                    key={provider}
                    yAxisId="deviation"
                    type="monotone"
                    dataKey={provider}
                    stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {loading && data && (
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Updating trend data...
          </div>
        )}
      </div>
    </div>
  );
}
