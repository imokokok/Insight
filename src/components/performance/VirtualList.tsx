'use client';

import { useRef, useCallback, useState, useEffect, forwardRef } from 'react';

import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimateSize: number | ((index: number) => number);
  overscan?: number;
  className?: string;
  itemClassName?: string;
  containerHeight: number | string;
  getItemKey?: (index: number, item: T) => string | number;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
}

export interface VirtualGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount: number;
  estimateSize: number;
  overscan?: number;
  className?: string;
  itemClassName?: string;
  containerHeight: number | string;
  gap?: number;
  onScroll?: (scrollTop: number) => void;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  emptyState?: React.ReactNode;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
}

// ============================================================================
// Virtual List Component
// ============================================================================

export function VirtualList<T>({
  items,
  renderItem,
  estimateSize,
  overscan = 5,
  className,
  itemClassName,
  containerHeight,
  getItemKey,
  onScroll,
  onEndReached,
  endReachedThreshold = 200,
  header,
  footer,
  emptyState,
  loading,
  loadingComponent,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(
      (index: number) => {
        return typeof estimateSize === 'function' ? estimateSize(index) : estimateSize;
      },
      [estimateSize]
    ),
    overscan,
    getItemKey: getItemKey ? (index: number) => getItemKey(index, items[index]) : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle scroll events
  useEffect(() => {
    const element = parentRef.current;
    if (!element || !onScroll) return;

    const handleScroll = () => {
      onScroll(element.scrollTop);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  // Handle end reached
  useEffect(() => {
    if (!onEndReached || hasReachedEnd || items.length === 0) return;

    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    const distanceToEnd = scrollHeight - scrollTop - clientHeight;

    if (distanceToEnd < endReachedThreshold) {
      setHasReachedEnd(true);
      onEndReached();
    }
  }, [virtualItems, onEndReached, endReachedThreshold, hasReachedEnd, items.length]);

  // Reset end reached when items change
  useEffect(() => {
    setHasReachedEnd(false);
  }, [items.length]);

  if (items.length === 0 && !loading) {
    return (
      <div
        ref={parentRef}
        className={cn('overflow-auto', className)}
        style={{ height: containerHeight }}
      >
        {emptyState || (
          <div className="flex items-center justify-center h-full text-gray-400">
            No items to display
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
    >
      {header}

      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem: VirtualItem) => (
          <div
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            className={cn('absolute top-0 left-0 w-full', itemClassName)}
            style={{
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>

      {loading &&
        (loadingComponent || (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ))}

      {footer}
    </div>
  );
}

// ============================================================================
// Virtual Grid Component
// ============================================================================

export function VirtualGrid<T>({
  items,
  renderItem,
  columnCount,
  estimateSize,
  overscan = 2,
  className,
  itemClassName,
  containerHeight,
  gap = 16,
  onScroll,
  onEndReached,
  endReachedThreshold = 200,
  emptyState,
  loading,
  loadingComponent,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  const rowCount = Math.ceil(items.length / columnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize + gap,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Handle scroll events
  useEffect(() => {
    const element = parentRef.current;
    if (!element || !onScroll) return;

    const handleScroll = () => {
      onScroll(element.scrollTop);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [onScroll]);

  // Handle end reached
  useEffect(() => {
    if (!onEndReached || hasReachedEnd || items.length === 0) return;

    const scrollElement = parentRef.current;
    if (!scrollElement) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    const distanceToEnd = scrollHeight - scrollTop - clientHeight;

    if (distanceToEnd < endReachedThreshold) {
      setHasReachedEnd(true);
      onEndReached();
    }
  }, [virtualItems, onEndReached, endReachedThreshold, hasReachedEnd, items.length]);

  // Reset end reached when items change
  useEffect(() => {
    setHasReachedEnd(false);
  }, [items.length]);

  if (items.length === 0 && !loading) {
    return (
      <div
        ref={parentRef}
        className={cn('overflow-auto', className)}
        style={{ height: containerHeight }}
      >
        {emptyState || (
          <div className="flex items-center justify-center h-full text-gray-400">
            No items to display
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualRow: VirtualItem) => {
          const rowIndex = virtualRow.index;
          const startIndex = rowIndex * columnCount;
          const endIndex = Math.min(startIndex + columnCount, items.length);
          const rowItems = items.slice(startIndex, endIndex);

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute top-0 left-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                height: estimateSize,
              }}
            >
              <div
                className="grid h-full"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  gap: `${gap}px`,
                }}
              >
                {rowItems.map((item, index) => (
                  <div key={startIndex + index} className={itemClassName}>
                    {renderItem(item, startIndex + index)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {loading &&
        (loadingComponent || (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ))}
    </div>
  );
}

// ============================================================================
// Auto-Sizing Virtual List
// ============================================================================

interface AutoSizeVirtualListProps<T> extends Omit<VirtualListProps<T>, 'containerHeight'> {
  maxHeight?: number | string;
  minHeight?: number | string;
}

export function AutoSizeVirtualList<T>({
  maxHeight = '100vh',
  minHeight = 200,
  className,
  ...props
}: AutoSizeVirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(400);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const maxHeightPx =
          typeof maxHeight === 'string' && maxHeight.endsWith('vh')
            ? (parseInt(maxHeight) / 100) * window.innerHeight
            : typeof maxHeight === 'number'
              ? maxHeight
              : rect.height;

        const minHeightPx = typeof minHeight === 'number' ? minHeight : 200;
        setContainerHeight(Math.max(Math.min(rect.height, maxHeightPx), minHeightPx));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [maxHeight, minHeight]);

  return (
    <div ref={containerRef} className={cn('flex-1', className)}>
      <VirtualList {...props} containerHeight={containerHeight} />
    </div>
  );
}

// ============================================================================
// Window Virtual List (uses window as scroll container)
// ============================================================================

export function WindowVirtualList<T>({
  items,
  renderItem,
  estimateSize,
  overscan = 5,
  className,
  itemClassName,
  getItemKey,
  onEndReached,
  endReachedThreshold = 200,
  header,
  footer,
  emptyState,
  loading,
  loadingComponent,
}: Omit<VirtualListProps<T>, 'containerHeight' | 'onScroll'>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrollTop(window.scrollY);

      if (onEndReached && !hasReachedEnd) {
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = window.innerHeight;
        const distanceToEnd = scrollHeight - window.scrollY - clientHeight;

        if (distanceToEnd < endReachedThreshold) {
          setHasReachedEnd(true);
          onEndReached();
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [onEndReached, endReachedThreshold, hasReachedEnd]);

  useEffect(() => {
    setHasReachedEnd(false);
  }, [items.length]);

  // Calculate visible range
  const startIndex = Math.max(
    0,
    Math.floor(scrollTop / (typeof estimateSize === 'number' ? estimateSize : 50)) - overscan
  );
  const visibleCount =
    Math.ceil(window.innerHeight / (typeof estimateSize === 'number' ? estimateSize : 50)) +
    overscan * 2;
  const endIndex = Math.min(items.length, startIndex + visibleCount);
  const visibleItems = items.slice(startIndex, endIndex);

  const totalHeight = items.length * (typeof estimateSize === 'number' ? estimateSize : 50);
  const offsetY = startIndex * (typeof estimateSize === 'number' ? estimateSize : 50);

  if (items.length === 0 && !loading) {
    return (
      <div className={className}>
        {emptyState || (
          <div className="flex items-center justify-center py-12 text-gray-400">
            No items to display
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      {header}

      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={getItemKey ? getItemKey(startIndex + index, item) : startIndex + index}
              className={itemClassName}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>

      {loading &&
        (loadingComponent || (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ))}

      {footer}
    </div>
  );
}
