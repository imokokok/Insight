import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Activity,
  ArrowUpDown,
} from 'lucide-react';

import { formatPrice, formatRelativeTime, formatNumberWithDecimals } from '@/lib/utils/format';
import { type OracleProvider } from '@/types/oracle';

import { ANOMALY_ZSCORE_THRESHOLD } from '../constants';

export type SortColumn = 'price' | 'deviation' | 'confidence' | 'updateTime';
export type SortDirection = 'asc' | 'desc';

export interface TableRow {
  provider: OracleProvider;
  price: number;
  deviation: number;
  deviationPercent: number;
  status: 'normal' | 'warning' | 'critical';
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | null;
  confidence: number;
  updateTime: number;
  zScore: number | null;
  freshnessSeconds: number;
  priceDiff: number | null;
  verification?: import('@/types/oracle/price').OnChainVerification;
}

export const formatDeviation = (deviation: number): string => {
  const sign = deviation >= 0 ? '+' : '';
  return `${sign}${deviation.toFixed(4)}%`;
};

export const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'text-emerald-600';
  if (absDeviation < 0.5) return 'text-yellow-600';
  if (absDeviation < 1.0) return 'text-orange-600';
  return 'text-red-600';
};

export const getDeviationBgColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return 'bg-emerald-50 border-emerald-200';
  if (absDeviation < 0.5) return 'bg-yellow-50 border-yellow-200';
  if (absDeviation < 1.0) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

export const StatusIcon = ({ status, severity }: { status: string; severity: string | null }) => {
  if (status === 'normal') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  }
  if (severity === 'high') {
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
  if (severity === 'medium') {
    return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  }
  return <Activity className="w-4 h-4 text-yellow-500" />;
};

export const SortIcon = ({
  column,
  sortColumn,
  sortDirection,
}: {
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
}) => {
  if (sortColumn !== column) {
    return <ArrowUpDown className="w-3 h-3 text-gray-300" />;
  }
  return sortDirection === 'asc' ? (
    <TrendingUp className="w-3 h-3 text-blue-500" />
  ) : (
    <TrendingDown className="w-3 h-3 text-blue-500" />
  );
};

function getAnomalyReason(row: TableRow): string {
  const reasons: string[] = [];
  if (Math.abs(row.deviationPercent) > 1) {
    reasons.push('Large deviation');
  }
  if (row.freshnessSeconds > 60) {
    reasons.push('Data delay');
  }
  if (row.zScore !== null && Math.abs(row.zScore) > ANOMALY_ZSCORE_THRESHOLD) {
    reasons.push('Outlier');
  }
  return reasons.length > 0 ? reasons.join(', ') : 'Unknown reason';
}

export function ExpandedRowDetail({ row }: { row: TableRow }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 text-sm py-3 px-2">
      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Raw Price</span>
        <span className="font-mono text-gray-900 text-lg">{formatPrice(row.price)}</span>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Price Diff</span>
        <div className="flex flex-col">
          <span
            className={`font-mono text-lg ${
              row.deviationPercent >= 0 ? 'text-red-600' : 'text-green-600'
            }`}
          >
            {row.deviationPercent >= 0 ? '+' : ''}
            {row.deviationPercent.toFixed(4)}%
          </span>
          {row.priceDiff !== null && (
            <span className="text-xs text-gray-500">
              {row.priceDiff >= 0 ? '+' : ''}$
              {formatNumberWithDecimals(Math.abs(row.priceDiff), 0, 4)}
            </span>
          )}
        </div>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Data Delay</span>
        <span
          className={`font-medium ${
            row.freshnessSeconds < 30
              ? 'text-green-600'
              : row.freshnessSeconds < 60
                ? 'text-yellow-600'
                : 'text-red-600'
          }`}
        >
          {formatRelativeTime(row.updateTime)}
        </span>
      </div>

      <div className="bg-white p-3 rounded-lg border border-gray-100">
        <span className="text-gray-500 block text-xs mb-1">Status</span>
        {row.isAnomaly ? (
          <div>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded ${
                row.severity === 'high'
                  ? 'text-red-600 bg-red-100'
                  : row.severity === 'medium'
                    ? 'text-orange-600 bg-orange-100'
                    : 'text-yellow-600 bg-yellow-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Anomaly
            </span>
            <p className="text-xs text-gray-500 mt-1">Possible reasons: {getAnomalyReason(row)}</p>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded text-green-600 bg-green-100">
            <CheckCircle2 className="w-3 h-3" />
            Normal
          </span>
        )}
      </div>

      {row.verification && (
        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <span className="text-gray-500 block text-xs mb-1">On-Chain Verification</span>
          <div className="space-y-1">
            <div className="text-xs text-gray-600">
              <span className="text-gray-400">Contract: </span>
              <code className="text-gray-700">
                {row.verification.contractAddress.slice(0, 10)}...
                {row.verification.contractAddress.slice(-6)}
              </code>
            </div>
            <div className="text-xs text-gray-600">
              <span className="text-gray-400">Method: </span>
              <code className="text-gray-700">{row.verification.method}</code>
            </div>
            {row.verification.explorerUrl && (
              <a
                href={row.verification.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 hover:underline"
              >
                Verify on Explorer →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
