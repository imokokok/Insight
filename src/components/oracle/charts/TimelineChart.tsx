'use client';

import { useMemo, useState } from 'react';
import { Info, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';

export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export interface TimelineChartProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent, index: number) => void;
  className?: string;
  showDateLabels?: boolean;
  compact?: boolean;
}

const typeConfig = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700',
    iconColor: 'text-blue-500',
    dotColor: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-500',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
    dotColor: 'bg-amber-500',
  },
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-100',
    borderColor: 'border-red-500',
    textColor: 'text-red-700',
    iconColor: 'text-red-500',
    dotColor: 'bg-red-500',
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-100',
    borderColor: 'border-green-500',
    textColor: 'text-green-700',
    iconColor: 'text-green-500',
    dotColor: 'bg-green-500',
  },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

export function TimelineChart({
  events,
  onEventClick,
  className = '',
  showDateLabels = true,
  compact = false,
}: TimelineChartProps) {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null);

  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [events]);

  const handleEventClick = (event: TimelineEvent, index: number) => {
    setExpandedEvent(expandedEvent === index ? null : index);
    onEventClick?.(event, index);
  };

  if (events.length === 0) {
    return (
      <div className={`flex items-center justify-center p-8 bg-gray-50 rounded-lg ${className}`}>
        <span className="text-sm text-gray-500">No events available</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Events */}
      <div className="space-y-4">
        {sortedEvents.map((event, index) => {
          const config = typeConfig[event.type];
          const Icon = config.icon;
          const isExpanded = expandedEvent === index;

          return (
            <div
              key={`event-${index}`}
              className={`
                relative flex gap-4 cursor-pointer
                transition-all duration-200 ease-in-out
                ${onEventClick ? 'hover:opacity-80' : ''}
              `}
              onClick={() => handleEventClick(event, index)}
            >
              {/* Dot */}
              <div
                className={`
                  relative z-10 w-8 h-8 rounded-full flex items-center justify-center
                  ${config.bgColor} border-2 ${config.borderColor}
                  flex-shrink-0
                `}
              >
                <Icon className={`w-4 h-4 ${config.iconColor}`} />
              </div>

              {/* Content */}
              <div
                className={`
                  flex-1 rounded-lg border p-3 transition-all duration-200
                  ${isExpanded ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:border-gray-300'}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-medium ${config.textColor} truncate`}>
                      {event.title}
                    </h4>
                    {showDateLabels && (
                      <span className="text-xs text-gray-500">
                        {compact ? formatDateShort(event.date) : formatDate(event.date)}
                      </span>
                    )}
                  </div>
                  <div
                    className={`
                      w-2 h-2 rounded-full flex-shrink-0 mt-1.5
                      ${config.dotColor}
                    `}
                  />
                </div>

                {/* Description - always show in compact mode, or when expanded */}
                {(compact || isExpanded) && (
                  <p
                    className={`
                      mt-2 text-sm text-gray-600
                      ${compact ? 'line-clamp-2' : ''}
                    `}
                  >
                    {event.description}
                  </p>
                )}

                {/* Expand indicator */}
                {!compact && !isExpanded && (
                  <p className="mt-1 text-xs text-gray-400">点击查看详情</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TimelineChart;
