'use client';

import { useState } from 'react';

import {
  Globe,
  Lock,
  MoreHorizontal,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import type { UserSnapshot } from '@/lib/supabase/queries';
import type { SnapshotStats } from '@/types/oracle/snapshot';

export function formatPrice(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

export function ChangeIndicator({ value, label }: { value: number; label: string }) {
  if (Math.abs(value) < 0.001) {
    return (
      <div className="flex items-center gap-1 text-gray-500">
        <Minus className="w-3 h-3" />
        <span className="text-xs">{label}: 0.00%</span>
      </div>
    );
  }

  const isPositive = value > 0;
  return (
    <div
      className={`flex items-center gap-1 ${isPositive ? 'text-success-600' : 'text-danger-600'}`}
    >
      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      <span className="text-xs font-medium">
        {label}: {formatPercent(value)}
      </span>
    </div>
  );
}

export function SnapshotCard({
  snapshot,
  onDelete,
  onTogglePublic,
  onSelectCompare,
  isCompareMode,
  isSelected,
}: {
  snapshot: UserSnapshot;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string, isPublic: boolean) => void;
  onSelectCompare: (snapshot: UserSnapshot) => void;
  isCompareMode: boolean;
  isSelected: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const oracleCount = snapshot.selected_oracles?.length ?? 0;
  const stats = snapshot.stats as SnapshotStats | null;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this snapshot? This action cannot be undone.'))
      return;
    setIsDeleting(true);
    setShowMenu(false);
    try {
      await onDelete(snapshot.id!);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`bg-white border rounded-lg transition-all duration-200 hover:shadow-md ${
        isSelected ? 'border-primary-400 ring-2 ring-primary-100' : 'border-gray-200'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isCompareMode && (
                <button
                  onClick={() => onSelectCompare(snapshot)}
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-colors ${
                    isSelected
                      ? 'bg-primary-600 border-primary-600'
                      : 'border-gray-300 hover:border-primary-400'
                  }`}
                >
                  {isSelected && (
                    <svg
                      className="w-3 h-3 text-white mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              )}
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {snapshot.name || `${snapshot.symbol} Snapshot`}
              </h3>
              <span
                className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                  snapshot.is_public ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {snapshot.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {snapshot.is_public ? 'Public' : 'Private'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTimeAgo(snapshot.created_at!)}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-medium text-primary-600">{snapshot.symbol}</span>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg py-1 z-20 shadow-lg">
                  <button
                    onClick={() => {
                      onTogglePublic(snapshot.id!, !snapshot.is_public);
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {snapshot.is_public ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                    {snapshot.is_public ? 'Make Private' : 'Make Public'}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {snapshot.selected_oracles?.slice(0, 4).map((oracle) => (
            <span
              key={oracle}
              className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-md font-medium"
            >
              {oracle}
            </span>
          ))}
          {oracleCount > 4 && (
            <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
              +{oracleCount - 4}
            </span>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500">Avg Price</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatPrice(stats.avgPrice)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Price Range</div>
              <div className="text-sm font-semibold text-gray-900">
                {formatPrice(stats.priceRange)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Std Dev</div>
              <div className="text-sm font-semibold text-gray-900">
                {stats.standardDeviationPercent.toFixed(2)}%
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Oracles</div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                {oracleCount}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-1 mt-3 pt-2 border-t border-gray-50 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? 'Less' : 'More details'}
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {isExpanded && stats && (
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-gray-500">Max Price</div>
                <div className="text-sm text-gray-900">{formatPrice(stats.maxPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Min Price</div>
                <div className="text-sm text-gray-900">{formatPrice(stats.minPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Weighted Avg</div>
                <div className="text-sm text-gray-900">{formatPrice(stats.weightedAvgPrice)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Variance</div>
                <div className="text-sm text-gray-900">{stats.variance.toFixed(6)}</div>
              </div>
            </div>
            {snapshot.price_data && snapshot.price_data.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-50">
                <div className="text-xs text-gray-500 mb-1.5">Price Data</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {snapshot.price_data.map((pd, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">{pd.provider}</span>
                      <span className="text-gray-900">{formatPrice(pd.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Created: {formatDate(snapshot.created_at!)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
