'use client';

import { useTranslations } from '@/i18n';
import { baseColors } from '@/lib/config/colors';
import { PredictionAccuracy } from './latencyUtils';
import { SegmentedControl, DropdownSelect, MultiSelect } from '@/components/ui';

interface LatencyPredictionProps {
  predictionPeriod: number;
  setPredictionPeriod: (period: number) => void;
  smaPeriod: number;
  setSmaPeriod: (period: number) => void;
  showPrediction: boolean;
  setShowPrediction: (show: boolean) => void;
  predictionAccuracy: PredictionAccuracy;
}

export function LatencyPrediction({
  predictionPeriod,
  setPredictionPeriod,
  smaPeriod,
  setSmaPeriod,
  showPrediction,
  setShowPrediction,
  predictionAccuracy,
}: LatencyPredictionProps) {
  const t = useTranslations();

  return (
    <div
      className="p-4"
      style={{
        backgroundColor: baseColors.gray[100],
        border: `1px solid ${baseColors.gray[200]}`,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill={baseColors.primary[600]} viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <h4 className="text-sm font-semibold" style={{ color: baseColors.gray[900] }}>
            {t('charts.latency.predictionControl')}
          </h4>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPrediction}
            onChange={(e) => setShowPrediction(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: baseColors.primary[600] }}
          />
          <span className="text-xs" style={{ color: baseColors.gray[700] }}>
            {t('charts.latency.showPrediction')}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: baseColors.gray[600] }}>
            {t('charts.latency.smaPeriod')}
          </label>
          <SegmentedControl
            options={[
              { value: '5', label: `5 ${t('charts.latency.points')}` },
              { value: '10', label: `10 ${t('charts.latency.points')}` },
              { value: '20', label: `20 ${t('charts.latency.points')}` },
            ]}
            value={smaPeriod.toString()}
            onChange={(value) => setSmaPeriod(Number(value))}
            size="sm"
            className="w-full"
          />
          <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
            {t('charts.latency.smaDescription')}
          </p>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: baseColors.gray[600] }}>
            {t('charts.latency.predictionPeriod')}
          </label>
          <SegmentedControl
            options={[
              { value: '5', label: `5 ${t('charts.latency.points')}` },
              { value: '10', label: `10 ${t('charts.latency.points')}` },
              { value: '20', label: `20 ${t('charts.latency.points')}` },
            ]}
            value={predictionPeriod.toString()}
            onChange={(value) => setPredictionPeriod(Number(value))}
            size="sm"
            className="w-full"
          />
          <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
            {t('charts.latency.predictionDescription')}
          </p>
        </div>
      </div>

      {showPrediction && (
        <div
          className="grid grid-cols-3 gap-3 pt-4"
          style={{ borderTop: `1px solid ${baseColors.primary[200]}` }}
        >
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
              MAE
            </p>
            <p className="text-lg font-bold" style={{ color: baseColors.primary[700] }}>
              {predictionAccuracy.mae}
              <span className="text-xs font-normal ml-1">ms</span>
            </p>
            <p className="text-xs" style={{ color: baseColors.primary[500] }}>
              {t('charts.latency.mae')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
              RMSE
            </p>
            <p className="text-lg font-bold" style={{ color: baseColors.primary[700] }}>
              {predictionAccuracy.rmse}
              <span className="text-xs font-normal ml-1">ms</span>
            </p>
            <p className="text-xs" style={{ color: baseColors.primary[500] }}>
              {t('charts.latency.rmse')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs mb-1" style={{ color: baseColors.primary[600] }}>
              MAPE
            </p>
            <p className="text-lg font-bold" style={{ color: baseColors.primary[700] }}>
              {predictionAccuracy.mape}
              <span className="text-xs font-normal ml-1">%</span>
            </p>
            <p className="text-xs" style={{ color: baseColors.primary[500] }}>
              {t('charts.latency.mape')}
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-xs" style={{ color: baseColors.gray[600] }}>
        <p>
          <span className="font-medium" style={{ color: baseColors.primary[700] }}>
            {t('charts.latency.predictionNote')}
          </span>
          {t('charts.latency.predictionNoteDesc', { smaPeriod, predictionPeriod })}
        </p>
      </div>
    </div>
  );
}
