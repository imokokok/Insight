'use client';

import { useState, useCallback, useMemo } from 'react';

import Link from 'next/link';

import {
  Camera,
  Trash2,
  GitCompare,
  Globe,
  Lock,
  MoreHorizontal,
  RefreshCw,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Database,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useSnapshots, useDeleteSnapshot, useUpdateSnapshot, useSnapshotsRealtime } from '@/hooks';
import type { UserSnapshot } from '@/lib/supabase/queries';
import { useUser, useAuthLoading } from '@/stores/authStore';
import type { SnapshotStats } from '@/types/oracle/snapshot';

function formatPrice(value: number): string {
  if (value === 0) return '$0.00';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatDate(dateStr: string): string {
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

function ChangeIndicator({ value, label }: { value: number; label: string }) {
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

function SnapshotCard({
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

function ComparisonPanel({
  snapshots,
  onClose,
}: {
  snapshots: [UserSnapshot, UserSnapshot];
  onClose: () => void;
}) {
  const [older, newer] =
    snapshots[0].created_at! < snapshots[1].created_at!
      ? [snapshots[0], snapshots[1]]
      : [snapshots[1], snapshots[0]];

  const olderStats = older.stats as SnapshotStats;
  const newerStats = newer.stats as SnapshotStats;

  const comparison = useMemo(() => {
    if (!olderStats || !newerStats) return null;

    const calcChange = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return current - previous;
    };

    const calcChangePercent = (current: number, previous: number): number => {
      if (previous === 0) return 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      priceChange: {
        avgPrice: calcChange(newerStats.avgPrice, olderStats.avgPrice),
        avgPricePercent: calcChangePercent(newerStats.avgPrice, olderStats.avgPrice),
        maxPrice: calcChange(newerStats.maxPrice, olderStats.maxPrice),
        maxPricePercent: calcChangePercent(newerStats.maxPrice, olderStats.maxPrice),
        minPrice: calcChange(newerStats.minPrice, olderStats.minPrice),
        minPricePercent: calcChangePercent(newerStats.minPrice, olderStats.minPrice),
      },
      oracleCountChange: (newer.price_data?.length ?? 0) - (older.price_data?.length ?? 0),
      statsChange: {
        priceRange: calcChange(newerStats.priceRange, olderStats.priceRange),
        priceRangePercent: calcChangePercent(newerStats.priceRange, olderStats.priceRange),
        standardDeviationPercent:
          newerStats.standardDeviationPercent - olderStats.standardDeviationPercent,
        standardDeviationPercentChange: calcChangePercent(
          newerStats.standardDeviationPercent,
          olderStats.standardDeviationPercent
        ),
        variance: calcChange(newerStats.variance, olderStats.variance),
        variancePercent: calcChangePercent(newerStats.variance, olderStats.variance),
      },
    };
  }, [olderStats, newerStats, older, newer]);

  if (!comparison) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500">Unable to compare snapshots.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Snapshot Comparison</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Comparing {newer.symbol} data between two snapshots
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Earlier Snapshot</div>
            <div className="text-sm font-medium text-gray-900">
              {older.name || `${older.symbol} Snapshot`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(older.created_at!)}</div>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg">
            <div className="text-xs text-primary-600 mb-1">Later Snapshot</div>
            <div className="text-sm font-medium text-gray-900">
              {newer.name || `${newer.symbol} Snapshot`}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{formatDate(newer.created_at!)}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Price Changes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Average Price</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.avgPrice)}
                </div>
                <ChangeIndicator value={comparison.priceChange.avgPricePercent} label="Change" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Max Price</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.maxPrice)}
                </div>
                <ChangeIndicator value={comparison.priceChange.maxPricePercent} label="Change" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Min Price</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.minPrice)}
                </div>
                <ChangeIndicator value={comparison.priceChange.minPricePercent} label="Change" />
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Dispersion Changes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Price Range</div>
                <div className="text-sm font-semibold text-gray-900">
                  {formatPrice(newerStats.priceRange)}
                </div>
                <ChangeIndicator value={comparison.statsChange.priceRangePercent} label="Change" />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Std Deviation</div>
                <div className="text-sm font-semibold text-gray-900">
                  {newerStats.standardDeviationPercent.toFixed(2)}%
                </div>
                <ChangeIndicator
                  value={comparison.statsChange.standardDeviationPercentChange}
                  label="Change"
                />
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 mb-1">Variance</div>
                <div className="text-sm font-semibold text-gray-900">
                  {newerStats.variance.toFixed(6)}
                </div>
                <ChangeIndicator value={comparison.statsChange.variancePercent} label="Change" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Database className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              Oracle count changed from{' '}
              <span className="font-medium text-gray-900">{older.price_data?.length ?? 0}</span> to{' '}
              <span className="font-medium text-gray-900">{newer.price_data?.length ?? 0}</span>
              {comparison.oracleCountChange !== 0 && (
                <span
                  className={`ml-1 text-xs font-medium ${
                    comparison.oracleCountChange > 0 ? 'text-success-600' : 'text-danger-600'
                  }`}
                >
                  ({comparison.oracleCountChange > 0 ? '+' : ''}
                  {comparison.oracleCountChange})
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SnapshotsContentInner() {
  const user = useUser();
  const authLoading = useAuthLoading();
  const { snapshots, isLoading, error, refetch } = useSnapshots();
  const { deleteSnapshot } = useDeleteSnapshot();
  const { updateSnapshot } = useUpdateSnapshot();
  useSnapshotsRealtime();

  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<UserSnapshot[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'symbol'>('newest');

  const filteredSnapshots = useMemo(() => {
    let result = [...snapshots];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name?.toLowerCase().includes(q) ||
          s.selected_oracles?.some((o: string) => o.toLowerCase().includes(q))
      );
    }

    switch (sortBy) {
      case 'newest':
        result.sort(
          (a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime()
        );
        break;
      case 'oldest':
        result.sort(
          (a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime()
        );
        break;
      case 'symbol':
        result.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
    }

    return result;
  }, [snapshots, searchQuery, sortBy]);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteSnapshot(id);
    },
    [deleteSnapshot]
  );

  const handleTogglePublic = useCallback(
    async (id: string, isPublic: boolean) => {
      await updateSnapshot(id, { is_public: isPublic });
    },
    [updateSnapshot]
  );

  const handleSelectCompare = useCallback((snapshot: UserSnapshot) => {
    setSelectedForCompare((prev) => {
      const exists = prev.find((s) => s.id === snapshot.id);
      if (exists) {
        return prev.filter((s) => s.id !== snapshot.id);
      }
      if (prev.length >= 2) {
        return [prev[1], snapshot];
      }
      return [...prev, snapshot];
    });
  }, []);

  const handleClearCompare = useCallback(() => {
    setCompareMode(false);
    setSelectedForCompare([]);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-white border border-gray-200 rounded-lg p-8">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Log In Required</h2>
          <p className="mt-2 text-gray-500">Please sign in to view and manage your snapshots.</p>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            Go to Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Price Snapshots</h1>
            <p className="mt-1 text-sm text-gray-500">
              View, compare, and manage your saved oracle price snapshots
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => refetch()}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant={compareMode ? 'primary' : 'secondary'}
              size="sm"
              leftIcon={<GitCompare className="w-4 h-4" />}
              onClick={() => {
                if (compareMode) {
                  handleClearCompare();
                } else {
                  setCompareMode(true);
                }
              }}
            >
              {compareMode ? 'Cancel Compare' : 'Compare'}
            </Button>
          </div>
        </div>

        {compareMode && (
          <div className="mt-4 p-3 bg-primary-50 border border-primary-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-primary-600" />
                <span className="text-sm text-primary-800">
                  Select 2 snapshots to compare ({selectedForCompare.length}/2 selected)
                </span>
              </div>
              {selectedForCompare.length === 2 && (
                <span className="text-xs text-primary-600 font-medium">
                  Comparison shown below ↓
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg">
          <p className="text-sm text-danger-600">{error.message || 'Failed to load snapshots'}</p>
        </div>
      )}

      {snapshots.length > 0 && (
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by symbol, name, or oracle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="symbol">By Symbol</option>
          </select>
        </div>
      )}

      {selectedForCompare.length === 2 && compareMode && (
        <div className="mb-6">
          <ComparisonPanel
            snapshots={selectedForCompare as [UserSnapshot, UserSnapshot]}
            onClose={handleClearCompare}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent animate-spin rounded-full" />
        </div>
      ) : filteredSnapshots.length === 0 ? (
        <EmptyStateEnhanced
          type={searchQuery ? 'search' : 'data'}
          title={searchQuery ? 'No matching snapshots' : 'No snapshots yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query'
              : 'Save a snapshot from the Cross-Oracle Comparison page to start tracking price data over time'
          }
          variant="card"
          size="lg"
        >
          {!searchQuery && (
            <Link href="/cross-oracle">
              <Button variant="primary" size="sm" leftIcon={<Camera className="w-4 h-4" />}>
                Go to Cross-Oracle Comparison
              </Button>
            </Link>
          )}
        </EmptyStateEnhanced>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnapshots.map((snapshot) => (
            <SnapshotCard
              key={snapshot.id}
              snapshot={snapshot}
              onDelete={handleDelete}
              onTogglePublic={handleTogglePublic}
              onSelectCompare={handleSelectCompare}
              isCompareMode={compareMode}
              isSelected={selectedForCompare.some((s) => s.id === snapshot.id)}
            />
          ))}
        </div>
      )}

      {filteredSnapshots.length > 0 && (
        <div className="mt-6 text-center text-xs text-gray-400">
          {filteredSnapshots.length} snapshot{filteredSnapshots.length !== 1 ? 's' : ''}
          {searchQuery && ' found'}
        </div>
      )}

      <div className="mt-8 p-4 bg-primary-50 border border-primary-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Camera className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-primary-800">About Snapshots</h3>
            <div className="mt-2 text-sm text-primary-700">
              <ul className="list-disc list-inside space-y-1">
                <li>Save the current oracle price state from the Cross-Oracle Comparison page</li>
                <li>Compare two snapshots to track price changes and dispersion over time</li>
                <li>Make snapshots public to share them with others</li>
                <li>Use snapshots for post-incident analysis when oracle deviations occur</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SnapshotsContent() {
  return (
    <ErrorBoundary level="page" componentName="SnapshotsContent">
      <SnapshotsContentInner />
    </ErrorBoundary>
  );
}
