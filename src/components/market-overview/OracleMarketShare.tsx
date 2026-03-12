'use client';

import { useMemo } from 'react';

interface OracleShare {
  name: string;
  share: number;
  color: string;
}

interface OracleMarketShareProps {
  title?: string;
}

const defaultOracles: OracleShare[] = [
  { name: 'Chainlink', share: 62.5, color: '#375bd2' },
  { name: 'Pyth Network', share: 18.3, color: '#e6c35c' },
  { name: 'API3', share: 8.7, color: '#7c3aed' },
  { name: 'Band Protocol', share: 6.2, color: '#0ea5e9' },
  { name: 'UMA', share: 4.3, color: '#f59e0b' },
];

export function OracleMarketShare({ title = 'Oracle Market Share' }: OracleMarketShareProps) {
  const sortedOracles = useMemo(() => {
    return [...defaultOracles].sort((a, b) => b.share - a.share);
  }, []);

  const totalShare = useMemo(() => {
    return sortedOracles.reduce((sum, oracle) => sum + oracle.share, 0);
  }, [sortedOracles]);

  return (
    <div className="bg-white border border-gray-200">
      {title && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        </div>
      )}
      <div className="p-6">
        {/* Progress bar visualization */}
        <div className="flex h-3 mb-6 rounded-full overflow-hidden">
          {sortedOracles.map((oracle) => (
            <div
              key={oracle.name}
              style={{
                width: `${(oracle.share / totalShare) * 100}%`,
                backgroundColor: oracle.color,
              }}
              className="h-full"
            />
          ))}
        </div>

        {/* Legend and details */}
        <div className="space-y-3">
          {sortedOracles.map((oracle) => (
            <div key={oracle.name} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: oracle.color }}
                />
                <span className="text-sm font-medium text-gray-900">{oracle.name}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {oracle.share.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total Market Coverage</span>
            <span className="text-sm font-semibold text-gray-900">{totalShare.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OracleMarketShare;
