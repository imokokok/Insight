'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';

interface ChartLegendProps {
  chartType: 'line' | 'candlestick';
  isMobile: boolean;
  comparisonEnabled: boolean;
  showMA7: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
  anomalyDetectionEnabled: boolean;
  anomaliesCount: number;
}

export const ChartLegend = memo(function ChartLegend({
  chartType,
  isMobile,
  comparisonEnabled,
  showMA7,
  showBollingerBands,
  showRSI,
  showMACD,
  showVolume,
  anomalyDetectionEnabled,
  anomaliesCount,
}: ChartLegendProps) {
  const t = useTranslations();

  if (chartType !== 'line') return null;

  return (
    <div
      className={`flex items-center justify-center gap-4 mt-3 flex-wrap ${isMobile ? 'gap-2' : ''}`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
          style={{ backgroundColor: chartColors.recharts.primary }}
        />
        <span
          className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
          style={{ color: baseColors.gray[500] }}
        >
          {t('priceChart.price')}
        </span>
      </div>
      {comparisonEnabled && (
        <div className="flex items-center gap-2">
          <span
            className={`${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
            style={{ borderTop: `2px dashed ${chartColors.recharts.purple}` }}
          />
          <span
            className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: baseColors.gray[500] }}
          >
            {t('priceChart.comparisonPrice')}
          </span>
        </div>
      )}
      {showMA7 && (
        <div className="flex items-center gap-2">
          <span
            className={`${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
            style={{ borderTop: `2px dashed ${chartColors.recharts.warning}` }}
          />
          <span
            className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: baseColors.gray[500] }}
          >
            {t('priceChart.ma7')}
          </span>
        </div>
      )}
      {!isMobile && showBollingerBands && (
        <>
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded"
              style={{
                backgroundColor: `${chartColors.recharts.purple}1A`,
                border: `1px dashed ${chartColors.recharts.purple}`,
              }}
            />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('priceChart.bollingerBands')}
            </span>
          </div>
        </>
      )}
      {!isMobile && showRSI && (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-0.5"
            style={{ backgroundColor: semanticColors.success.DEFAULT }}
          />
          <span className="text-xs" style={{ color: baseColors.gray[500] }}>
            {t('priceChart.rsi')}
          </span>
        </div>
      )}
      {!isMobile && showMACD && (
        <>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5" style={{ backgroundColor: chartColors.macd.line }} />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('priceChart.macd')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5" style={{ backgroundColor: chartColors.macd.signal }} />
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('priceChart.signal')}
            </span>
          </div>
        </>
      )}
      {!isMobile && showVolume && (
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: `${semanticColors.success.DEFAULT}4D` }}
          />
          <span className="text-xs" style={{ color: baseColors.gray[500] }}>
            {t('priceChart.volume')}
          </span>
        </div>
      )}
      {anomalyDetectionEnabled && anomaliesCount > 0 && (
        <div className="flex items-center gap-2">
          <span
            className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`}
            style={{ backgroundColor: semanticColors.danger.DEFAULT }}
          />
          <span
            className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: baseColors.gray[500] }}
          >
            {t('priceChart.anomalyPoints')} ({anomaliesCount})
          </span>
        </div>
      )}
    </div>
  );
});
