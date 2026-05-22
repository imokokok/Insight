'use client';

import { useState, useCallback, useMemo } from 'react';

import Link from 'next/link';

import { Camera, GitCompare, RefreshCw, Search, X } from 'lucide-react';

import { ErrorBoundary } from '@/components/error-boundary';
import { Button } from '@/components/ui';
import { EmptyStateEnhanced } from '@/components/ui/EmptyStateEnhanced';
import { useSnapshots, useDeleteSnapshot, useUpdateSnapshot, useSnapshotsRealtime } from '@/hooks';
import type { UserSnapshot } from '@/lib/supabase/queries';
import { useUser, useAuthLoading } from '@/stores/authStore';

import { ComparisonPanel } from './components/ComparisonPanel';
import { SnapshotCard } from './components/SnapshotCard';

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
