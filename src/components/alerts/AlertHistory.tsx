'use client';

import { useState, useMemo, useCallback } from 'react';
import { AlertEvent } from '@/lib/supabase/database.types';
import { useAcknowledgeAlert } from '@/hooks/useAlerts';
import { DashboardCard } from '@/components/oracle/DashboardCard';

interface AlertHistoryProps {
  events: AlertEvent[];
  isLoading: boolean;
  onRefresh: () => void;
}

type FilterStatus = 'all' | 'acknowledged' | 'unacknowledged';
type SortOrder = 'newest' | 'oldest';

export function AlertHistory({ events, isLoading, onRefresh }: AlertHistoryProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const { acknowledge, isAcknowledging } = useAcknowledgeAlert();

  const filteredAndSortedEvents = useMemo(() => {
    let filtered = [...events];

    if (filterStatus === 'acknowledged') {
      filtered = filtered.filter((e) => e.acknowledged);
    } else if (filterStatus === 'unacknowledged') {
      filtered = filtered.filter((e) => !e.acknowledged);
    }

    filtered.sort((a, b) => {
      const timeA = new Date(a.triggered_at).getTime();
      const timeB = new Date(b.triggered_at).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return filtered;
  }, [events, filterStatus, sortOrder]);

  const handleAcknowledge = useCallback(
    async (eventId: string) => {
      await acknowledge(eventId);
      onRefresh();
    },
    [acknowledge, onRefresh]
  );

  const unacknowledgedCount = useMemo(() => events.filter((e) => !e.acknowledged).length, [events]);

  if (isLoading) {
    return (
      <DashboardCard title="告警历史">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent animate-spin" />
        </div>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="告警历史"
      headerAction={
        <div className="flex items-center gap-2">
          {unacknowledgedCount > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
              {unacknowledgedCount} 未确认
            </span>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">状态:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">全部</option>
              <option value="unacknowledged">未确认</option>
              <option value="acknowledged">已确认</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">排序:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
            >
              <option value="newest">最新优先</option>
              <option value="oldest">最早优先</option>
            </select>
          </div>
        </div>

        {filteredAndSortedEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="mt-2 text-sm">暂无告警历史</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAndSortedEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 border rounded-lg transition-colors ${
                  event.acknowledged
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          event.acknowledged
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {event.acknowledged ? '已确认' : '待确认'}
                      </span>
                    </div>

                    <p className="text-sm font-medium text-gray-900">{event.condition_met}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>触发价格: {event.price.toFixed(4)}</span>
                      <span>时间: {new Date(event.triggered_at).toLocaleString('zh-CN')}</span>
                      {event.acknowledged && event.acknowledged_at && (
                        <span>
                          确认时间: {new Date(event.acknowledged_at).toLocaleString('zh-CN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {!event.acknowledged && (
                    <button
                      onClick={() => handleAcknowledge(event.id!)}
                      disabled={isAcknowledging}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                    >
                      {isAcknowledging ? '确认中...' : '确认'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <div className="pt-3 border-t border-gray-200 text-xs text-gray-400 text-center">
            共 {events.length} 条记录，显示 {filteredAndSortedEvents.length} 条
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
