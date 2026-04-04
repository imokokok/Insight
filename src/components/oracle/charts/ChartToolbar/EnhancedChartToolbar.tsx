'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { type ChartExportData } from '@/lib/utils/chartExport';
import { createLogger } from '@/lib/utils/logger';

import { ChartExportButton } from '../../forms/ChartExportButton';

const logger = createLogger('EnhancedChartToolbar');

export type ToolbarButtonSize = 'sm' | 'md' | 'lg';
export type ToolbarButtonVariant = 'default' | 'active' | 'danger' | 'success';

export interface ToolbarButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  variant?: ToolbarButtonVariant;
  isActive?: boolean;
  disabled?: boolean;
  badge?: number | string;
  shortcut?: string;
}

export interface ToolbarGroup {
  id: string;
  title?: string;
  buttons: ToolbarButton[];
}

export interface EnhancedChartToolbarProps {
  symbol: string;
  currentPrice: number;
  priceChange: { value: number; percent: number };
  chartContainerRef: React.RefObject<HTMLDivElement>;
  exportData: ChartExportData[];
  groups?: ToolbarGroup[];
  customButtons?: ToolbarButton[];
  showFullscreen?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  showSettings?: boolean;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
  isFullscreen?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// Tooltip Component
interface TooltipProps {
  content: string;
  shortcut?: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

function Tooltip({ content, shortcut, children, position = 'bottom' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg whitespace-nowrap pointer-events-none ${positionClasses[position]}`}
          style={{
            animation: 'tooltipFadeIn 0.15s ease-out',
          }}
        >
          <div className="font-medium">{content}</div>
          {shortcut && <div className="text-gray-400 mt-0.5 text-[10px]">{shortcut}</div>}
          <div
            className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`}
          />
        </div>
      )}
    </div>
  );
}

// Toolbar Button Component
interface ToolbarButtonProps {
  button: ToolbarButton;
  size?: ToolbarButtonSize;
  isMobile?: boolean;
}

function ToolbarButtonComponent({ button, size = 'md', isMobile = false }: ToolbarButtonProps) {
  const getVariantStyles = (variant: ToolbarButtonVariant = 'default', isActive = false) => {
    if (isActive) {
      return {
        backgroundColor: baseColors.primary[100],
        color: baseColors.primary[700],
        borderColor: baseColors.primary[300],
      };
    }

    switch (variant) {
      case 'danger':
        return {
          backgroundColor: 'transparent',
          color: semanticColors.danger.DEFAULT,
          borderColor: baseColors.gray[200],
        };
      case 'success':
        return {
          backgroundColor: 'transparent',
          color: semanticColors.success.DEFAULT,
          borderColor: baseColors.gray[200],
        };
      default:
        return {
          backgroundColor: 'transparent',
          color: baseColors.gray[600],
          borderColor: baseColors.gray[200],
        };
    }
  };

  const sizeClasses = {
    sm: isMobile ? 'p-1.5' : 'p-2',
    md: isMobile ? 'p-2' : 'px-3 py-2',
    lg: isMobile ? 'p-2.5' : 'px-4 py-2.5',
  };

  const styles = getVariantStyles(button.variant, button.isActive);

  return (
    <Tooltip content={button.tooltip} shortcut={button.shortcut}>
      <button
        onClick={button.onClick}
        disabled={button.disabled}
        className={`
          ${sizeClasses[size]}
          inline-flex items-center gap-1.5
          rounded-lg border
          font-medium text-sm
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:shadow-sm
          ${isMobile ? 'min-w-[36px] min-h-[36px] justify-center' : ''}
        `}
        style={{
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          borderColor: styles.borderColor,
        }}
        onMouseEnter={(e) => {
          if (!button.isActive && !button.disabled) {
            e.currentTarget.style.backgroundColor = baseColors.gray[50];
          }
        }}
        onMouseLeave={(e) => {
          if (!button.isActive && !button.disabled) {
            e.currentTarget.style.backgroundColor = styles.backgroundColor;
          }
        }}
      >
        <span className={isMobile ? 'w-4 h-4' : 'w-4 h-4'}>{button.icon}</span>
        {!isMobile && <span className="hidden sm:inline">{button.label}</span>}
        {button.badge !== undefined && (
          <span
            className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full"
            style={{
              backgroundColor:
                button.variant === 'danger'
                  ? semanticColors.danger.DEFAULT
                  : baseColors.primary[500],
              color: '#ffffff',
            }}
          >
            {button.badge}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

// Price Display Component
interface PriceDisplayProps {
  symbol: string;
  currentPrice: number;
  priceChange: { value: number; percent: number };
  isMobile?: boolean;
}

function PriceDisplay({ symbol, currentPrice, priceChange, isMobile = false }: PriceDisplayProps) {
  const isPositive = priceChange.percent >= 0;

  return (
    <div className="flex items-center gap-3">
      <div>
        <div className="flex items-baseline gap-2">
          <span
            className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}
            style={{ color: baseColors.gray[900] }}
          >
            ${currentPrice.toFixed(4)}
          </span>
          <span
            className={`text-sm font-medium ${isPositive ? 'text-success-600' : 'text-danger-600'}`}
          >
            {isPositive ? '+' : ''}
            {priceChange.percent.toFixed(2)}%
          </span>
        </div>
        {!isMobile && (
          <div className="text-xs" style={{ color: baseColors.gray[500] }}>
            {symbol.toUpperCase()}
          </div>
        )}
      </div>
    </div>
  );
}

// Main Toolbar Component
export function EnhancedChartToolbar({
  symbol,
  currentPrice,
  priceChange,
  chartContainerRef,
  exportData,
  groups = [],
  customButtons = [],
  showFullscreen = true,
  showExport = true,
  showRefresh = true,
  showSettings = true,
  onRefresh,
  onFullscreen,
  onSettings,
  isFullscreen = false,
  isMobile = false,
  isLoading = false,
  className = '',
  children,
}: EnhancedChartToolbarProps) {
  const t = useTranslations('chartToolbar');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    if (isRefreshing || isLoading) return;

    setIsRefreshing(true);
    logger.info('Refreshing chart data');

    onRefresh?.();

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, [isRefreshing, isLoading, onRefresh]);

  const handleFullscreen = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (!isFullscreen) {
      chartContainerRef.current.requestFullscreen?.().catch((err) => {
        logger.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        logger.error('Error exiting fullscreen:', err);
      });
    }

    onFullscreen?.();
  }, [chartContainerRef, isFullscreen, onFullscreen]);

  // Default toolbar buttons
  const defaultButtons: ToolbarButton[] = [
    ...(showRefresh
      ? [
          {
            id: 'refresh',
            icon: (
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            ),
            label: t('buttons.refresh'),
            tooltip: t('tooltips.refresh'),
            onClick: handleRefresh,
            shortcut: 'R',
            disabled: isLoading,
          } as ToolbarButton,
        ]
      : []),
    ...(showFullscreen
      ? [
          {
            id: 'fullscreen',
            icon: isFullscreen ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            ),
            label: isFullscreen ? t('buttons.exitFullscreen') : t('buttons.fullscreen'),
            tooltip: isFullscreen ? t('tooltips.exitFullscreen') : t('tooltips.fullscreen'),
            onClick: handleFullscreen,
            shortcut: 'F',
            isActive: isFullscreen,
          } as ToolbarButton,
        ]
      : []),
    ...(showSettings
      ? [
          {
            id: 'settings',
            icon: (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            ),
            label: t('buttons.settings'),
            tooltip: t('tooltips.settings'),
            onClick: () => onSettings?.(),
            shortcut: 'S',
          } as ToolbarButton,
        ]
      : []),
  ];

  const allButtons = [...defaultButtons, ...customButtons];

  return (
    <div
      className={`
        flex flex-col gap-3
        p-3 rounded-lg
        border border-gray-200
        bg-white
        ${className}
      `}
      style={{
        backgroundColor: baseColors.gray[50],
        borderColor: baseColors.gray[200],
      }}
    >
      {/* Top Row: Price and Main Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PriceDisplay
          symbol={symbol}
          currentPrice={currentPrice}
          priceChange={priceChange}
          isMobile={isMobile}
        />

        {/* Main Toolbar Actions */}
        <div className="flex items-center gap-2">
          {allButtons.map((button) => (
            <ToolbarButtonComponent
              key={button.id}
              button={button}
              size={isMobile ? 'sm' : 'md'}
              isMobile={isMobile}
            />
          ))}

          {showExport && chartContainerRef.current && (
            <ChartExportButton
              chartRef={chartContainerRef}
              data={exportData}
              filename={`${symbol.toLowerCase()}-chart`}
              compact={isMobile}
            />
          )}
        </div>
      </div>

      {/* Custom Groups */}
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-2">
              {group.title && !isMobile && (
                <span className="text-xs font-medium text-gray-500 mr-1">{group.title}:</span>
              )}
              <div className="flex items-center gap-1">
                {group.buttons.map((button) => (
                  <ToolbarButtonComponent
                    key={button.id}
                    button={button}
                    size={isMobile ? 'sm' : 'sm'}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Additional Content */}
      {children && <div className="pt-2 border-t border-gray-200">{children}</div>}

      {/* CSS Animation for Tooltip */}
      <style jsx global>{`
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default EnhancedChartToolbar;
