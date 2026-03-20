'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@/stores/authStore';
import type { OracleSnapshot } from '@/types/oracle';
import { OracleProvider } from '@/types/oracle';
import { formatTimestamp, getTimeAgo } from '@/types/common/timestamps';
import {
  getSnapshotsFromDatabase,
  deleteSnapshotFromDatabase,
  shareSnapshot,
  unshareSnapshot,
  getSnapshotShareStatus,
  getSnapshotsFromLocalStorage,
  deleteSnapshotFromLocalStorage,
  clearAllLocalStorageSnapshots,
  detectLocalStorageSnapshots,
  migrateSnapshotsToDatabase,
  clearLocalStorageSnapshots,
  markMigrationComplete,
} from '@/lib/snapshots';
import { useTranslations } from 'next-intl';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SnapshotManager');

const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLOR]: 'Tellor',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

interface SnapshotManagerProps {
  onSaveSnapshot?: () => void;
  onSelectSnapshot?: (snapshot: OracleSnapshot) => void;
  selectedSnapshotId?: string | null;
}

interface ShareState {
  [key: string]: boolean;
}

export function SnapshotManager({
  onSaveSnapshot,
  onSelectSnapshot,
  selectedSnapshotId,
}: SnapshotManagerProps) {
  const user = useUser();
  const t = useTranslations();
  const [snapshots, setSnapshots] = useState<OracleSnapshot[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [shareStates, setShareStates] = useState<ShareState>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false);
  const [migrationSnapshots, setMigrationSnapshots] = useState<OracleSnapshot[]>([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const copiedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const loadTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadSnapshots();
  }, [user]);

  useEffect(() => {
    if (user) {
      const localSnapshots = detectLocalStorageSnapshots();
      if (localSnapshots.length > 0) {
        setMigrationSnapshots(localSnapshots);
        setShowMigrationPrompt(true);
      }
    }
  }, [user]);

  const loadSnapshots = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        const dbSnapshots = await getSnapshotsFromDatabase(user.id);
        setSnapshots(dbSnapshots);

        const states: ShareState = {};
        for (const snapshot of dbSnapshots) {
          states[snapshot.id] = await getSnapshotShareStatus(snapshot.id);
        }
        setShareStates(states);
      } else {
        const localSnapshots = getSnapshotsFromLocalStorage();
        setSnapshots(localSnapshots);
      }
    } catch (error) {
      logger.error(
        'Failed to load snapshots',
        error instanceof Error ? error : new Error(String(error))
      );
      setSnapshots([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleDeleteSnapshot = async (id: string) => {
    try {
      if (user) {
        const success = await deleteSnapshotFromDatabase(id);
        if (success) {
          await loadSnapshots();
        }
      } else {
        const success = deleteSnapshotFromLocalStorage(id);
        if (success) {
          await loadSnapshots();
        }
      }
    } catch (error) {
      logger.error(
        'Failed to delete snapshot',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    setShowDeleteConfirm(null);
  };

  const handleClearAll = async () => {
    if (user) {
      for (const snapshot of snapshots) {
        await deleteSnapshotFromDatabase(snapshot.id);
      }
    } else {
      clearAllLocalStorageSnapshots();
    }
    setSnapshots([]);
    setShowClearConfirm(false);
  };

  const handleShare = async (id: string) => {
    if (!user) return;

    try {
      const isCurrentlyShared = shareStates[id];
      if (isCurrentlyShared) {
        await unshareSnapshot(id);
        setShareStates((prev) => ({ ...prev, [id]: false }));
      } else {
        await shareSnapshot(id);
        setShareStates((prev) => ({ ...prev, [id]: true }));
      }
    } catch (error) {
      logger.error(
        'Failed to toggle share',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  const handleCopyShareLink = async (id: string) => {
    const shareUrl = `${window.location.origin}/snapshot/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      if (copiedTimerRef.current) {
        clearTimeout(copiedTimerRef.current);
      }
      copiedTimerRef.current = setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      logger.error(
        'Failed to copy share link',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  };

  const handleMigrate = async () => {
    if (!user?.id || migrationSnapshots.length === 0) return;

    setIsMigrating(true);
    try {
      const result = await migrateSnapshotsToDatabase(user.id, migrationSnapshots);

      if (result.success) {
        clearLocalStorageSnapshots();
        markMigrationComplete();
        setShowMigrationPrompt(false);
        setMigrationSnapshots([]);
        await loadSnapshots();
      } else {
        logger.error('Migration completed with errors', undefined, { errors: result.errors });
      }
    } catch (error) {
      logger.error(
        'Failed to migrate snapshots',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsMigrating(false);
    }
  };

  const handleDismissMigration = () => {
    setShowMigrationPrompt(false);
  };

  const handleRemindLater = () => {
    setShowMigrationPrompt(false);
  };

  return (
    <div className="bg-white border border-gray-200">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('snapshot.title')}</h3>
            <p className="text-xs text-gray-500">
              {isLoading
                ? t('home.loading')
                : t('snapshot.savedCount', { count: snapshots.length })}
              {user && ` ${t('snapshot.cloudLabel')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onSaveSnapshot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveSnapshot();
                if (loadTimerRef.current) {
                  clearTimeout(loadTimerRef.current);
                }
                loadTimerRef.current = setTimeout(loadSnapshots, 100);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700 transition-colors"
            >
              {t('snapshot.saveSnapshot')}
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4">
          {snapshots.length === 0 ? (
            <div className="text-center py-8">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-sm text-gray-500">{t('snapshot.noSnapshot')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('snapshot.noSnapshotDesc')}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">{t('snapshot.snapshotList')}</span>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-danger-600 hover:text-danger-700"
                >
                  {t('snapshot.clearAll')}
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`p-3 border transition-all cursor-pointer ${
                      selectedSnapshotId === snapshot.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => onSelectSnapshot?.(snapshot)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {snapshot.symbol}
                          </span>
                          <span className="text-xs text-gray-400">
                            {getTimeAgo(snapshot.timestamp, t)}
                          </span>
                          {user && shareStates[snapshot.id] && (
                            <span className="px-1.5 py-0.5 text-xs bg-success-100 text-success-700 border border-green-200">
                              {t('snapshot.shared')}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {formatTimestamp(snapshot.timestamp)}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                            {snapshot.selectedOracles.length}{' '}
                            {t('snapshot.oracleCount', {
                              count: snapshot.selectedOracles.length,
                            }).replace('{count} ', '')}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {snapshot.selectedOracles.slice(0, 3).map((oracle) => (
                            <span
                              key={oracle}
                              className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200"
                            >
                              {oracleNames[oracle]}
                            </span>
                          ))}
                          {snapshot.selectedOracles.length > 3 && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 border border-gray-200">
                              +{snapshot.selectedOracles.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">{t('snapshot.avgPrice')}</span>
                            <span className="ml-1 font-medium text-gray-700">
                              $
                              {snapshot.stats.avgPrice.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">{t('snapshot.deviation')}</span>
                            <span className="ml-1 font-medium text-gray-700">
                              {snapshot.stats.standardDeviationPercent.toFixed(4)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {user && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(snapshot.id);
                              }}
                              className={`p-1 transition-colors ${
                                shareStates[snapshot.id]
                                  ? 'text-success-600 hover:text-success-700'
                                  : 'text-gray-400 hover:text-indigo-600'
                              }`}
                              title={
                                shareStates[snapshot.id]
                                  ? t('snapshot.unshare')
                                  : t('snapshot.shareSnapshot')
                              }
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                              </svg>
                            </button>
                            {shareStates[snapshot.id] && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyShareLink(snapshot.id);
                                }}
                                className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                                title={t('snapshot.copyShareLink')}
                              >
                                {copiedId === snapshot.id ? (
                                  <svg
                                    className="w-4 h-4 text-success-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                    />
                                  </svg>
                                )}
                              </button>
                            )}
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(snapshot.id);
                          }}
                          className="p-1 text-gray-400 hover:text-danger-600 transition-colors"
                          title={t('snapshot.deleteSnapshot')}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showMigrationPrompt && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {t('snapshot.migrateToCloud')}
                </h4>
                <p className="text-sm text-gray-500">
                  {t('snapshot.localSnapshotsDetected', { count: migrationSnapshots.length })}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">{t('snapshot.migrationDesc')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleRemindLater}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200"
              >
                {t('snapshot.remindLater')}
              </button>
              <button
                onClick={handleDismissMigration}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200"
              >
                {t('snapshot.skip')}
              </button>
              <button
                onClick={handleMigrate}
                disabled={isMigrating}
                className="px-4 py-2 text-sm bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 hover:border-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isMigrating ? t('snapshot.migrating') : t('snapshot.startMigration')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-sm mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {t('snapshot.confirmDelete')}
            </h4>
            <p className="text-sm text-gray-600 mb-4">{t('snapshot.confirmDeleteDesc')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200"
              >
                {t('snapshot.cancel')}
              </button>
              <button
                onClick={() => handleDeleteSnapshot(showDeleteConfirm)}
                className="px-4 py-2 text-sm bg-danger-600 text-white border border-danger-600 hover:bg-danger-700 hover:border-red-700"
              >
                {t('snapshot.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 max-w-sm mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              {t('snapshot.confirmClear')}
            </h4>
            <p className="text-sm text-gray-600 mb-4">{t('snapshot.confirmClearDesc')}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 border border-gray-200"
              >
                {t('snapshot.cancel')}
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm bg-danger-600 text-white border border-danger-600 hover:bg-danger-700 hover:border-red-700"
              >
                {t('snapshot.clear')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
