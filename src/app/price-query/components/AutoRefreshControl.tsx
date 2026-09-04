'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

import { RefreshCw, ChevronDown, Clock } from 'lucide-react';

import { REFRESH_INTERVALS, type RefreshInterval } from '@/hooks/useAutoRefresh';
import { cn } from '@/lib/utils';
import { formatCountdown, formatTimeString } from '@/lib/utils/format';

interface AutoRefreshControlProps {
  refreshInterval: RefreshInterval;
  onIntervalChange: (interval: RefreshInterval) => void;
  lastRefreshedAt: Date | null;
  nextRefreshAt: Date | null;
  isRefreshing?: boolean;
  className?: string;
}

export function AutoRefreshControl({
  refreshInterval,
  onIntervalChange,
  lastRefreshedAt,
  nextRefreshAt,
  isRefreshing = false,
  className,
}: AutoRefreshControlProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState<string>('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isActive = refreshInterval !== 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isActive || !nextRefreshAt) {
      return;
    }

    const updateCountdown = () => {
      const remaining = nextRefreshAt.getTime() - Date.now();
      setCountdown(remaining > 0 ? formatCountdown(remaining) : '...');
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [isActive, nextRefreshAt]);

  const handleSelect = useCallback(
    (value: RefreshInterval) => {
      onIntervalChange(value);
      setIsOpen(false);
    },
    [onIntervalChange]
  );

  const currentLabel = REFRESH_INTERVALS.find((i) => i.value === refreshInterval)?.label ?? 'Off';

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Auto refresh: ${currentLabel}`}
        className={cn(
          'inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-xs font-medium transition-colors',
          isActive
            ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
        )}
      >
        <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
        <span>{isActive ? currentLabel : 'Auto Refresh'}</span>
        {isActive && countdown && (
          <span className="text-[10px] text-blue-500 font-mono">{countdown}</span>
        )}
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label="Auto refresh interval"
          className="absolute right-0 z-50 mt-1 w-44 overflow-hidden border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
        >
          <div className="py-1">
            {REFRESH_INTERVALS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={refreshInterval === option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'w-full px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center justify-between transition-colors',
                  refreshInterval === option.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-700'
                )}
              >
                <span>{option.label}</span>
                {refreshInterval === option.value && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          {lastRefreshedAt && (
            <div className="px-3 py-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Last refreshed: {formatTimeString(lastRefreshedAt, false)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
