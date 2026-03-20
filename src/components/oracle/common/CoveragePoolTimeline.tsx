'use client';

import { useState, useMemo } from 'react';
import { CoveragePoolEvent } from '@/lib/oracles/api3';
import { DashboardCard } from './DashboardCard';

interface CoveragePoolTimelineProps {
  data: CoveragePoolEvent[];
}

type FilterType = 'all' | 'claim' | 'parameter_change' | 'reward_distribution';

const EVENT_CONFIG = {
  claim: {
    label: '索赔',
    color: 'bg-danger-500',
    bgColor: 'bg-danger-50',
    textColor: 'text-danger-700',
    borderColor: 'border-danger-200',
  },
  parameter_change: {
    label: '参数变更',
    color: 'bg-primary-500',
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-700',
    borderColor: 'border-primary-200',
  },
  reward_distribution: {
    label: '奖励发放',
    color: 'bg-success-500',
    bgColor: 'bg-success-50',
    textColor: 'text-success-700',
    borderColor: 'border-green-200',
  },
};

const STATUS_CONFIG = {
  pending: { label: '待处理', color: 'bg-warning-100 text-warning-700' },
  approved: { label: '已批准', color: 'bg-primary-100 text-primary-700' },
  rejected: { label: '已拒绝', color: 'bg-danger-100 text-danger-700' },
  completed: { label: '已完成', color: 'bg-success-100 text-success-700' },
};

function formatTimestamp(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return '刚刚';
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return formatTimestamp(date);
}

function formatAmount(amount: number | undefined): string {
  if (!amount) return '-';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function truncateHash(hash: string): string {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text);
}

export function CoveragePoolTimeline({ data }: CoveragePoolTimelineProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedEvent, setSelectedEvent] = useState<CoveragePoolEvent | null>(null);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return data;
    return data.filter((event) => event.type === filter);
  }, [data, filter]);

  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [filteredEvents]);

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: 'all', label: '全部' },
    { id: 'claim', label: '索赔' },
    { id: 'parameter_change', label: '参数变更' },
    { id: 'reward_distribution', label: '奖励发放' },
  ];

  return (
    <>
      <DashboardCard>
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">保险池事件时间线</h3>
            <p className="text-sm text-gray-500 mt-1">历史索赔和重要事件记录</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`px-4 py-2 text-sm font-medium  transition-all duration-200 ${
                  filter === btn.id
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {sortedEvents.length === 0 ? (
                <div className="pl-10 py-8 text-center text-gray-500">暂无相关事件记录</div>
              ) : (
                sortedEvents.map((event) => {
                  const config = EVENT_CONFIG[event.type];
                  const statusConfig = STATUS_CONFIG[event.status];

                  return (
                    <div key={event.id} className="relative pl-10">
                      <div
                        className={`absolute left-2.5 w-3 h-3  ${config.color} ring-4 ring-white`}
                        style={{ top: '1.25rem' }}
                      />

                      <div
                        className={`bg-white border ${config.borderColor}  p-4 hover: transition-shadow duration-200 cursor-pointer`}
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 text-xs font-medium  ${config.bgColor} ${config.textColor}`}
                            >
                              {config.label}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium  ${statusConfig.color}`}
                            >
                              {statusConfig.label}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {formatRelativeTime(event.timestamp)}
                          </span>
                        </div>

                        <p className="text-sm text-gray-700 mb-3">{event.description}</p>

                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-4">
                            {event.amount && (
                              <div className="flex items-center gap-1">
                                <svg
                                  className="w-3.5 h-3.5 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                <span className="font-medium text-gray-600">
                                  {formatAmount(event.amount)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <svg
                                className="w-3.5 h-3.5 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                />
                              </svg>
                              <span className="text-gray-500 font-mono">
                                {truncateHash(event.txHash)}
                              </span>
                            </div>
                          </div>
                          <span className="text-primary-500">查看详情 →</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {sortedEvents.length > 0 && (
            <div className="pt-4 border-t border-gray-100 text-center">
              <span className="text-xs text-gray-400">共 {sortedEvents.length} 条事件记录</span>
            </div>
          )}
        </div>
      </DashboardCard>

      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white  max-w-lg w-full max-h-[90vh] overflow-y-auto "
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">事件详情</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100  transition-colors"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1.5 text-sm font-medium  ${EVENT_CONFIG[selectedEvent.type].bgColor} ${EVENT_CONFIG[selectedEvent.type].textColor}`}
                >
                  {EVENT_CONFIG[selectedEvent.type].label}
                </span>
                <span
                  className={`px-3 py-1.5 text-sm font-medium  ${STATUS_CONFIG[selectedEvent.status].color}`}
                >
                  {STATUS_CONFIG[selectedEvent.status].label}
                </span>
              </div>

              <div className="bg-gray-50  p-4">
                <p className="text-sm text-gray-600">{selectedEvent.description}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">事件ID</span>
                  <span className="text-sm font-medium text-gray-900 font-mono">
                    {selectedEvent.id}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">时间戳</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatTimestamp(selectedEvent.timestamp)}
                  </span>
                </div>

                {selectedEvent.amount && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-500">金额</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatAmount(selectedEvent.amount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">状态</span>
                  <span
                    className={`text-sm font-medium ${STATUS_CONFIG[selectedEvent.status].color.split(' ')[1]}`}
                  >
                    {STATUS_CONFIG[selectedEvent.status].label}
                  </span>
                </div>

                <div className="py-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">交易哈希</span>
                    <button
                      onClick={() => {
                        copyToClipboard(selectedEvent.txHash);
                      }}
                      className="flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm"
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
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      复制
                    </button>
                  </div>
                  <div className="bg-gray-100  p-3">
                    <p className="text-xs font-mono text-gray-600 break-all">
                      {selectedEvent.txHash}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-medium  hover:bg-gray-200 transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={() => {
                    window.open(`https://etherscan.io/tx/${selectedEvent.txHash}`, '_blank');
                  }}
                  className="flex-1 py-2.5 px-4 bg-primary-600 text-white font-medium  hover:bg-primary-700 transition-colors"
                >
                  在区块浏览器中查看
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
