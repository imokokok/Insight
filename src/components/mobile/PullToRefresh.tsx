'use client';

import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react';

import { Loader2 } from 'lucide-react';

import { useTranslations } from '@/i18n';

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  pullDistance?: number;
  maxPullDistance?: number;
  resistance?: number;
  className?: string;
}

interface PullState {
  isPulling: boolean;
  pullProgress: number;
  isRefreshing: boolean;
}

export function PullToRefresh({
  children,
  onRefresh,
  pullDistance = 80,
  maxPullDistance = 120,
  resistance = 0.7,
  className = '',
}: PullToRefreshProps) {
  const t = useTranslations();
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isAtTop = useRef(true);

  const [pullState, setPullState] = useState<PullState>({
    isPulling: false,
    pullProgress: 0,
    isRefreshing: false,
  });

  // Check if scroll is at top
  const checkIsAtTop = useCallback(() => {
    if (containerRef.current) {
      isAtTop.current = containerRef.current.scrollTop <= 0;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', checkIsAtTop);
      return () => container.removeEventListener('scroll', checkIsAtTop);
    }
  }, [checkIsAtTop]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!isAtTop.current || pullState.isRefreshing) return;

      startY.current = e.touches[0].clientY;
      currentY.current = startY.current;

      setPullState((prev) => ({ ...prev, isPulling: true }));
    },
    [pullState.isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pullState.isPulling || !isAtTop.current) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      if (deltaY > 0) {
        e.preventDefault();
        const resistedDelta = deltaY * resistance;
        const progress = Math.min(resistedDelta / pullDistance, 1);
        const clampedProgress = Math.min(resistedDelta / maxPullDistance, 1);

        setPullState((prev) => ({
          ...prev,
          pullProgress: clampedProgress,
        }));
      }
    },
    [pullState.isPulling, pullDistance, maxPullDistance, resistance]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pullState.isPulling) return;

    const deltaY = currentY.current - startY.current;
    const resistedDelta = deltaY * resistance;

    if (resistedDelta >= pullDistance && !pullState.isRefreshing) {
      setPullState({
        isPulling: false,
        pullProgress: 1,
        isRefreshing: true,
      });

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setPullState({
          isPulling: false,
          pullProgress: 0,
          isRefreshing: false,
        });
      }
    } else {
      setPullState({
        isPulling: false,
        pullProgress: 0,
        isRefreshing: false,
      });
    }
  }, [pullState.isPulling, pullState.isRefreshing, pullDistance, onRefresh]);

  const getIndicatorTransform = () => {
    const baseTranslate = -50;
    const pullTranslate = pullState.pullProgress * pullDistance;
    return `translateY(${baseTranslate + pullTranslate}px)`;
  };

  const getContentTransform = () => {
    if (pullState.isRefreshing) {
      return `translateY(${pullDistance}px)`;
    }
    const translate = pullState.pullProgress * pullDistance * 0.5;
    return `translateY(${translate}px)`;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto overflow-x-hidden ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {/* Pull Indicator */}
      <div
        className="absolute left-1/2 z-10 flex flex-col items-center justify-center transition-transform duration-200"
        style={{
          transform: getIndicatorTransform(),
          top: 0,
        }}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
            pullState.pullProgress >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {pullState.isRefreshing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg
              className="w-5 h-5 transition-transform duration-200"
              style={{
                transform: `rotate(${pullState.pullProgress * 180}deg)`,
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          )}
        </div>
        <span className="mt-2 text-xs text-gray-500">
          {pullState.isRefreshing
            ? t('mobile.pullToRefresh.refreshing')
            : pullState.pullProgress >= 1
              ? t('mobile.pullToRefresh.release')
              : t('mobile.pullToRefresh.pull')}
        </span>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: getContentTransform(),
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
