'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { OracleDeviationEntry, DeviationDirection } from '../types/index';

// ── Oracle color map ──
const ORACLE_COLORS: Record<string, string> = {
  chainlink: '#375BD2',
  pyth: '#F9AF2D',
  twap: '#10B981',
  redstone: '#EC1F24',
  api3: '#7B61FF',
  dia: '#1E2B3D',
  winklink: '#FF4D4D',
  supra: '#14B8A6',
  reflector: '#F59E0B',
  flare: '#8B0FE5',
};

function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function DirectionIcon({ direction }: { direction: DeviationDirection }) {
  switch (direction) {
    case 'positive':
      return <ArrowUp className="w-3.5 h-3.5 text-red-500" />;
    case 'negative':
      return <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />;
    default:
      return <Minus className="w-3.5 h-3.5 text-gray-400" />;
  }
}

interface DeviationTableProps {
  deviations: OracleDeviationEntry[];
  threshold: number;
}

export function DeviationTable({ deviations, threshold: _threshold }: DeviationTableProps) {
  if (deviations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 text-center text-sm text-gray-500">
        No deviation data available
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Oracle
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Spot Price
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              TWAP Price
            </th>
            <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Deviation %
            </th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Direction
            </th>
            <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {deviations.map((entry) => {
            const isOver = entry.isOverThreshold;
            const oracleColor = ORACLE_COLORS[entry.provider] || '#6B7280';

            return (
              <tr
                key={entry.provider}
                className={cn(
                  'border-b border-gray-50 last:border-0 transition-colors',
                  isOver ? 'bg-red-50/30' : 'hover:bg-gray-50/50'
                )}
              >
                {/* Oracle */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: oracleColor }}
                    />
                    <span className="font-medium text-gray-900 capitalize">{entry.provider}</span>
                  </div>
                </td>

                {/* Spot Price */}
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {formatPrice(entry.spotPrice)}
                </td>

                {/* TWAP Price */}
                <td className="px-4 py-3 text-right font-mono text-gray-700">
                  {formatPrice(entry.twapPrice)}
                </td>

                {/* Deviation % */}
                <td
                  className={cn(
                    'px-4 py-3 text-right font-mono font-medium',
                    isOver ? 'text-red-600' : 'text-emerald-600'
                  )}
                >
                  {entry.deviationPercent > 0 ? '+' : ''}
                  {entry.deviationPercent.toFixed(2)}%
                </td>

                {/* Direction */}
                <td className="px-4 py-3 text-center">
                  <DirectionIcon direction={entry.direction} />
                </td>

                {/* Status */}
                <td className="px-4 py-3 text-center">
                  {isOver ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 rounded-full uppercase">
                      Over Threshold
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full uppercase">
                      Normal
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
