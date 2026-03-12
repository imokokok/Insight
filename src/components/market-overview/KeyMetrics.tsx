'use client';

import { Shield, Activity, Database, RefreshCw } from 'lucide-react';

interface Metric {
  id: string;
  label: string;
  value: string;
  icon: React.ElementType;
}

const metrics: Metric[] = [
  {
    id: 'tvs',
    label: 'Total Value Secured',
    value: '$45.2B',
    icon: Shield,
  },
  {
    id: 'oracles',
    label: 'Active Oracles',
    value: '5',
    icon: Activity,
  },
  {
    id: 'assets',
    label: 'Supported Assets',
    value: '1,200+',
    icon: Database,
  },
  {
    id: 'updates',
    label: '24h Updates',
    value: '2.4M',
    icon: RefreshCw,
  },
];

export default function KeyMetrics() {
  return (
    <div className="bg-white border border-gray-200 shadow-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const isLast = index === metrics.length - 1;

          return (
            <div
              key={metric.id}
              className={`
                flex items-center gap-4 px-6 py-6
                ${!isLast ? 'border-b sm:border-b-0' : ''}
                sm:border-r sm:last:border-r-0
                lg:border-r lg:last:border-r-0
                ${index < 2 ? 'sm:border-b lg:border-b-0' : ''}
                border-gray-200
              `}
            >
              <div className="flex-shrink-0">
                <Icon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-gray-500">{metric.label}</span>
                <span className="text-2xl font-semibold text-gray-900">{metric.value}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
