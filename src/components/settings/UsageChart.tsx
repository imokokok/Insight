'use client';

import { useEffect, useState } from 'react';

import { Loader2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { PLANS, type Plan } from '@/lib/billing/plans';

interface UsageData {
  key: {
    id: string;
    name: string;
    plan: string;
  };
  total: number;
  byDate: Array<{ date: string; count: number }>;
  byEndpoint: Array<{ endpoint: string; count: number }>;
}

interface UsageChartProps {
  apiKeyId: string;
  plan: Plan;
  accessToken: string;
}

const PIE_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
];

const SLATE_500 = '#64748b';
const SLATE_200 = '#e2e8f0';

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function shortenEndpoint(endpoint: string): string {
  // /api/v1/safety/liquidation → /safety/liquidation
  return endpoint.replace('/api/v1', '').replace('/api', '') || '/';
}

export function UsageChart({ apiKeyId, plan, accessToken }: UsageChartProps) {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKeyId || !accessToken) return;

    const fetchUsage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/user/api-keys/${apiKeyId}/usage`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error?.message || 'Failed to load usage');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load usage');
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [apiKeyId, accessToken]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600 py-4">{error}</p>;
  }

  if (!data || data.total === 0) {
    return (
      <p className="text-sm text-slate-500 py-4 text-center">
        No usage in the last 7 days. Make some API calls to see analytics here.
      </p>
    );
  }

  const planConfig = PLANS[plan];

  return (
    <div className="space-y-6">
      {/* Metering summary — every key is credit-metered from the wallet. */}
      <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100">
        <div className="text-sm font-semibold text-emerald-800">
          {planConfig.name} key — credit-metered
        </div>
        <p className="text-xs text-emerald-700/80 mt-1">
          This key is charged per call from your credit wallet (C1–C4). See your balance and top up
          in Settings → Billing.
        </p>
      </div>

      {/* Daily usage bar chart */}
      <div>
        <h4 className="text-sm font-semibold text-slate-700 mb-3">Calls per day (last 7 days)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.byDate}>
            <XAxis
              dataKey="date"
              tickFormatter={formatDateShort}
              tick={{ fontSize: 12, fill: SLATE_500 }}
              axisLine={{ stroke: SLATE_200 }}
              tickLine={{ stroke: SLATE_200 }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: SLATE_500 }}
              axisLine={{ stroke: SLATE_200 }}
              tickLine={{ stroke: SLATE_200 }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '12px',
                border: `1px solid ${SLATE_200}`,
                fontSize: '13px',
                backgroundColor: '#ffffff',
              }}
              labelFormatter={(label) => `Date: ${formatDateShort(label as string)}`}
            />
            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Endpoint distribution pie chart */}
      {data.byEndpoint.length > 1 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Calls by endpoint</h4>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={160}>
              <PieChart>
                <Pie
                  data={data.byEndpoint.slice(0, 8)}
                  dataKey="count"
                  nameKey="endpoint"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  innerRadius={30}
                >
                  {data.byEndpoint.slice(0, 8).map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: `1px solid ${SLATE_200}`,
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                  }}
                  formatter={(value, name) => [value as number, shortenEndpoint(name as string)]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {data.byEndpoint.slice(0, 6).map((item, idx) => (
                <div key={item.endpoint} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor: PIE_COLORS[idx % PIE_COLORS.length],
                      }}
                    />
                    <span className="text-slate-600 truncate font-mono">
                      {shortenEndpoint(item.endpoint)}
                    </span>
                  </div>
                  <span className="text-slate-900 font-medium ml-2 tabular-nums">
                    {item.count.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
