'use client';

import { useState, useEffect } from 'react';
import {
  OracleSnapshot,
  getSnapshots,
  deleteSnapshot,
  clearAllSnapshots,
  formatTimestamp,
  getTimeAgo,
} from '@/lib/types/snapshot';
import { OracleProvider } from '@/lib/types/oracle';

const oracleNames: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

interface SnapshotManagerProps {
  onSaveSnapshot?: () => void;
  onSelectSnapshot?: (snapshot: OracleSnapshot) => void;
  selectedSnapshotId?: string | null;
}

export function SnapshotManager({
  onSaveSnapshot,
  onSelectSnapshot,
  selectedSnapshotId,
}: SnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<OracleSnapshot[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    loadSnapshots();
  }, []);

  const loadSnapshots = () => {
    const loadedSnapshots = getSnapshots();
    setSnapshots(loadedSnapshots);
  };

  const handleDeleteSnapshot = (id: string) => {
    if (deleteSnapshot(id)) {
      loadSnapshots();
      setShowDeleteConfirm(null);
    }
  };

  const handleClearAll = () => {
    if (clearAllSnapshots()) {
      setSnapshots([]);
      setShowClearConfirm(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">数据快照</h3>
            <p className="text-xs text-gray-500">已保存 {snapshots.length} 个快照</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onSaveSnapshot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSaveSnapshot();
                setTimeout(loadSnapshots, 100);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              保存快照
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <p className="text-sm text-gray-500">暂无快照</p>
              <p className="text-xs text-gray-400 mt-1">点击「保存快照」按钮保存当前数据</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-500">快照列表</span>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  清空全部
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {snapshots.map((snapshot) => (
                  <div
                    key={snapshot.id}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
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
                            {getTimeAgo(snapshot.timestamp)}
                          </span>
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
                                strokeLinecap="round"
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
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                              />
                            </svg>
                            {snapshot.selectedOracles.length} 个预言机
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {snapshot.selectedOracles.slice(0, 3).map((oracle) => (
                            <span
                              key={oracle}
                              className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                            >
                              {oracleNames[oracle]}
                            </span>
                          ))}
                          {snapshot.selectedOracles.length > 3 && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              +{snapshot.selectedOracles.length - 3}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-400">均价:</span>
                            <span className="ml-1 font-medium text-gray-700">
                              $
                              {snapshot.stats.avgPrice.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">偏差:</span>
                            <span className="ml-1 font-medium text-gray-700">
                              {snapshot.stats.standardDeviationPercent.toFixed(4)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(snapshot.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除快照"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h4>
            <p className="text-sm text-gray-600 mb-4">确定要删除这个快照吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteSnapshot(showDeleteConfirm)}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">确认清空</h4>
            <p className="text-sm text-gray-600 mb-4">确定要清空所有快照吗？此操作无法撤销。</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
