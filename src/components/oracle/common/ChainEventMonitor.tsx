'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChainEvent, EventType, BandProtocolClient, EVENT_TYPE_VALUES } from '@/lib/oracles/bandProtocol';
import { DashboardCard } from './DashboardCard';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ChainEventMonitor');

export interface ChainEventMonitorProps {
  client: BandProtocolClient;
  refreshInterval?: number;
}

const EVENT_TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; bgColor: string; icon: React.ReactNode }
> = {
  [EventType.DELEGATION]: {
    label: '委托',
    color: 'text-success-600',
    bgColor: 'bg-success-50',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  [EventType.UNDELEGATION]: {
    label: '解除委托',
    color: 'text-warning-600',
    bgColor: 'bg-warning-50',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
      </svg>
    ),
  },
  [EventType.COMMISSION_CHANGE]: {
    label: '佣金变更',
    color: 'text-primary-600',
    bgColor: 'bg-primary-50',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  [EventType.JAILED]: {
    label: '节点监禁',
    color: 'text-danger-600',
    bgColor: 'bg-danger-50',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
        />
      </svg>
    ),
  },
  [EventType.UNJAILED]: {
    label: '节点释放',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"
        />
      </svg>
    ),
  },
};

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

function truncateTxHash(hash: string): string {
  if (hash.length <= 16) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
}

export function ChainEventMonitor({ client, refreshInterval = 30000 }: ChainEventMonitorProps) {
  const t = useTranslations();
  const [events, setEvents] = useState<ChainEvent[]>([]);
  const [selectedType, setSelectedType] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await client.getChainEvents(20, selectedType || undefined);
      setEvents(data);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error(
        'Failed to fetch chain events',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, selectedType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchEvents();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [fetchEvents, refreshInterval, isLive]);

  const filteredEvents = useMemo(() => {
    if (!selectedType) return events;
    return events.filter((event) => event.type === selectedType);
  }, [events, selectedType]);

  const eventTypeCounts = useMemo(() => {
    const counts: Record<EventType, number> = {
      [EventType.DELEGATION]: 0,
      [EventType.UNDELEGATION]: 0,
      [EventType.COMMISSION_CHANGE]: 0,
      [EventType.JAILED]: 0,
      [EventType.UNJAILED]: 0,
    };
    events.forEach((event) => {
      counts[event.type]++;
    });
    return counts;
  }, [events]);

  const largeAmountEvents = useMemo(() => {
    return filteredEvents.filter((event) => event.amount > 10000);
  }, [filteredEvents]);

  return (
    <DashboardCard
      title="链上事件监控"
      headerAction={
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
              isLive
                ? 'bg-success-100 text-success-700 hover:bg-success-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5  ${isLive ? 'bg-success-500 animate-pulse' : 'bg-gray-400'}`}
            />
            {isLive ? '实时' : '暂停'}
          </button>
          <button
            onClick={fetchEvents}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
            title="刷新"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* 事件类型筛选标签 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedType(null)}
            className={`px-3 py-1.5  text-xs font-medium transition-colors ${
              selectedType === null
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            全部 ({events.length})
          </button>
          {EVENT_TYPE_VALUES.map((type) => {
            const config = EVENT_TYPE_CONFIG[type];
            const count = eventTypeCounts[type];
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-1.5 px-3 py-1.5  text-xs font-medium transition-colors ${
                  selectedType === type
                    ? `${config.bgColor} ${config.color} ring-1 ring-inset ring-current`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {config.icon}
                <span>{config.label}</span>
                <span className="text-gray-400">({count})</span>
              </button>
            );
          })}
        </div>

        {/* 大额事件提示 */}
        {largeAmountEvents.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 ">
            <svg
              className="w-4 h-4 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="text-sm text-amber-800">
              检测到 <strong>{largeAmountEvents.length}</strong> 笔大额交易（&gt;10,000 BAND）
            </span>
          </div>
        )}

        {/* 事件列表 */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredEvents.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-sm text-gray-500">暂无事件数据</p>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const config = EVENT_TYPE_CONFIG[event.type];
              const isLargeAmount = event.amount > 10000;

              return (
                <div
                  key={event.id}
                  className={`flex items-start gap-3 p-3  border transition-colors ${
                    isLargeAmount
                      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                      : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  {/* 事件图标 */}
                  <div
                    className={`flex-shrink-0 w-8 h-8  flex items-center justify-center ${config.bgColor} ${config.color}`}
                  >
                    {config.icon}
                  </div>

                  {/* 事件内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${config.bgColor} ${config.color}`}
                      >
                        {config.label}
                      </span>
                      {isLargeAmount && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                          大额
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-900 mt-1 truncate">{event.description}</p>
                    <p className="text-xs text-gray-500 mt-0.5">验证人: {event.validator}</p>
                    {event.amount > 0 && (
                      <p
                        className={`text-sm font-medium mt-1 ${isLargeAmount ? 'text-amber-700' : 'text-gray-900'}`}
                      >
                        {event.amount.toLocaleString()} BAND
                      </p>
                    )}
                  </div>

                  {/* 时间和交易哈希 */}
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-500">{formatRelativeTime(event.timestamp)}</p>
                    <a
                      href={`https://www.mintscan.io/band/txs/${event.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:text-primary-800 hover:underline mt-1 inline-block font-mono"
                      title={event.txHash}
                    >
                      {truncateTxHash(event.txHash)}
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 底部信息 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
          </p>
          <p className="text-xs text-gray-400">显示 {filteredEvents.length} 条事件</p>
        </div>
      </div>
    </DashboardCard>
  );
}
