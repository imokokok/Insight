'use client';

import { DropdownSelect } from '@/components/ui';

export interface TechnicalIndicatorsProps {
  showMA: boolean;
  onShowMAChange: (value: boolean) => void;
  maPeriod: number;
  onMaPeriodChange: (value: number) => void;
  onResetChart: () => void;
}

const maPeriodOptions = [
  { value: 7, label: '7' },
  { value: 25, label: '25' },
  { value: 99, label: '99' },
];

export function TechnicalIndicators({
  showMA,
  onShowMAChange,
  maPeriod,
  onMaPeriodChange,
  onResetChart,
}: TechnicalIndicatorsProps) {
  return (
    <div>
      <h3 className="text-xs font-medium text-gray-700 uppercase tracking-wide mb-2">
        Technical Indicators
      </h3>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA}
            onChange={(e) => onShowMAChange(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Show Moving Average</span>
        </label>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 uppercase tracking-wide">MA Period:</label>
          <DropdownSelect
            options={maPeriodOptions}
            value={maPeriod}
            onChange={(value) => onMaPeriodChange(value as number)}
            disabled={!showMA}
            className="w-20"
          />
        </div>
        <button
          onClick={onResetChart}
          className="w-full px-3 py-2 text-xs bg-white border border-gray-300 text-gray-700 rounded-md transition-all duration-200 hover:bg-gray-50 hover:border-gray-400"
        >
          Reset Chart
        </button>
      </div>
    </div>
  );
}
