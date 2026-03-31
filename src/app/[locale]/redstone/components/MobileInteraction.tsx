'use client';

import { useState, useCallback, useRef, useMemo } from 'react';

import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('MobileInteraction');

export interface MobileInteractionProps {
  children: React.ReactNode;
  onRefresh?: () => Promise<void>;
  tabs?: Array<{ id: string; label: string }>;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  enablePullToRefresh?: boolean;
  enableSwipeNavigation?: boolean;
}

export interface TouchSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
}

export function TouchSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  showValue = true,
  formatValue,
}: TouchSliderProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  const handleInteraction = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;

      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(1, x / rect.width));
      const rawValue = min + percent * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      onChange(clampedValue);
    },
    [min, max, step, onChange]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      handleInteraction(e.touches[0].clientX);
    },
    [handleInteraction]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (isDragging) {
        handleInteraction(e.touches[0].clientX);
      }
    },
    [isDragging, handleInteraction]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      handleInteraction(e.clientX);
    },
    [handleInteraction]
  );

  const displayValue = formatValue ? formatValue(value) : value.toString();

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{label}</span>
          {showValue && <span className="text-sm font-medium text-gray-900">{displayValue}</span>}
        </div>
      )}
      <div
        ref={sliderRef}
        className="relative h-12 flex items-center cursor-pointer select-none touch-none"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-red-500 rounded-full"
            style={{ width: `${percentage}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
        <motion.div
          className="absolute w-6 h-6 bg-white border-2 border-red-500 rounded-full shadow-lg"
          style={{ left: `calc(${percentage}% - 12px)` }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
          transition={{ duration: 0.15 }}
        />
      </div>
    </div>
  );
}

interface SwipeableTabNavigationProps {
  tabs: Array<{ id: string; label: string }>;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
}

export function SwipeableTabNavigation({
  tabs,
  activeTab,
  onTabChange,
  children,
}: SwipeableTabNavigationProps) {
  const t = useTranslations();
  const [showTabList, setShowTabList] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentIndex = useMemo(
    () => tabs.findIndex((tab) => tab.id === activeTab),
    [tabs, activeTab]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const threshold = 50;
      const velocity = info.velocity.x;
      const offset = info.offset.x;

      if (Math.abs(velocity) > 500 || Math.abs(offset) > threshold) {
        if (offset < 0 && currentIndex < tabs.length - 1) {
          onTabChange(tabs[currentIndex + 1].id);
        } else if (offset > 0 && currentIndex > 0) {
          onTabChange(tabs[currentIndex - 1].id);
        }
      }
    },
    [currentIndex, tabs, onTabChange]
  );

  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      onTabChange(tabs[currentIndex - 1].id);
    }
  }, [currentIndex, tabs, onTabChange]);

  const goToNext = useCallback(() => {
    if (currentIndex < tabs.length - 1) {
      onTabChange(tabs[currentIndex + 1].id);
    }
  }, [currentIndex, tabs, onTabChange]);

  return (
    <div className="relative lg:hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button onClick={() => setShowTabList(true)} className="flex-1 mx-2 text-center">
          <div className="text-sm font-medium text-gray-900 truncate">
            {tabs[currentIndex]?.label}
          </div>
          <div className="text-xs text-gray-500">
            {currentIndex + 1} / {tabs.length}
          </div>
        </button>

        <button
          onClick={goToNext}
          disabled={currentIndex === tabs.length - 1}
          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div ref={containerRef} className="overflow-hidden touch-pan-y">
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="touch-pan-y"
        >
          {children}
        </motion.div>
      </div>

      <div className="flex justify-center gap-1.5 py-2 bg-white border-t border-gray-100">
        {tabs.map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              index === currentIndex ? 'bg-red-500' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <AnimatePresence>
        {showTabList && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowTabList(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50 max-h-[70vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('redstone.mobile.selectTab')}
                </h3>
                <button
                  onClick={() => setShowTabList(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[calc(70vh-60px)]">
                {tabs.map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setShowTabList(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      tab.id === activeTab
                        ? 'bg-red-50 text-red-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="w-6 text-center text-xs text-gray-400">{index + 1}</span>
                    <span className="flex-1 font-medium">{tab.label}</span>
                    {tab.id === activeTab && <span className="text-xs text-red-500">{t('mobileInteraction.current')}</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export function PullToRefresh({ children, onRefresh, disabled = false }: PullToRefreshProps) {
  const t = useTranslations();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const y = useMotionValue(0);
  const rotate = useTransform(y, [0, 80], [0, 360]);
  const opacity = useTransform(y, [0, 40, 80], [0, 0.5, 1]);
  const scale = useTransform(y, [0, 80], [0.8, 1]);

  const handleDragEnd = useCallback(
    async (_: unknown, info: PanInfo) => {
      if (info.offset.y > 80 && !isRefreshing && !disabled) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          logger.error('Refresh failed', error as Error);
        } finally {
          setIsRefreshing(false);
        }
      }
    },
    [onRefresh, isRefreshing, disabled]
  );

  return (
    <div className="relative overflow-hidden">
      <motion.div
        style={{ y: isRefreshing ? 60 : 0 }}
        className="absolute top-0 left-0 right-0 flex justify-center pt-4 pointer-events-none"
      >
        <motion.div
          style={{ opacity: isRefreshing ? 1 : opacity, scale }}
          className="p-2 bg-white rounded-full shadow-lg"
        >
          <motion.div style={{ rotate: isRefreshing ? undefined : rotate }}>
            <RefreshCw className={`w-5 h-5 text-red-500 ${isRefreshing ? 'animate-spin' : ''}`} />
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        drag={disabled ? false : 'y'}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.5, bottom: 0 }}
        onDrag={(_, info) => {
          if (info.offset.y > 0) {
            y.set(info.offset.y);
          }
        }}
        onDragEnd={(_, info) => {
          y.set(0);
          handleDragEnd(_, info);
        }}
        style={{ y: useTransform(y, (v) => (isRefreshing ? 60 : Math.min(v, 100))) }}
        className="touch-pan-x"
      >
        {children}
      </motion.div>

      {isRefreshing && (
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center justify-center bg-gradient-to-b from-white to-transparent pointer-events-none">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <RefreshCw className="w-4 h-4 animate-spin" />
            {t('redstone.mobile.refreshing')}
          </div>
        </div>
      )}
    </div>
  );
}

interface MobileChartOptimizerProps {
  children: React.ReactNode;
  title?: string;
  defaultExpanded?: boolean;
}

export function MobileChartOptimizer({
  children,
  title,
  defaultExpanded = false,
}: MobileChartOptimizerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-50 bg-white' : ''}`}
      >
        {isExpanded && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>
        )}
        <div
          className={`${
            isExpanded ? 'h-[calc(100vh-60px)]' : 'h-48 sm:h-64'
          } transition-all duration-300`}
        >
          {children}
        </div>
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute bottom-2 right-2 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-gray-600 hover:text-gray-900 lg:hidden"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

interface MobileQuickActionsProps {
  actions: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'danger';
  }>;
}

export function MobileQuickActions({ actions }: MobileQuickActionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-red-500 text-white rounded-full shadow-lg flex items-center justify-center z-30"
      >
        <MoreHorizontal className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl z-50"
            >
              <div className="p-4">
                <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
                <div className="grid grid-cols-3 gap-4">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick();
                        setIsOpen(false);
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-colors ${
                        action.variant === 'primary'
                          ? 'bg-red-50 text-red-600'
                          : action.variant === 'danger'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {action.icon}
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileInteraction({
  children,
  onRefresh,
  tabs,
  activeTab,
  onTabChange,
  enablePullToRefresh = true,
  enableSwipeNavigation = true,
}: MobileInteractionProps) {
  const content =
    enableSwipeNavigation && tabs && activeTab && onTabChange ? (
      <SwipeableTabNavigation tabs={tabs} activeTab={activeTab} onTabChange={onTabChange}>
        {children}
      </SwipeableTabNavigation>
    ) : (
      <>{children}</>
    );

  if (enablePullToRefresh && onRefresh) {
    return <PullToRefresh onRefresh={onRefresh}>{content}</PullToRefresh>;
  }

  return content;
}
