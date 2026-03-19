'use client';

import { useLocale } from 'next-intl';
import { isChineseLocale } from '@/i18n/routing';

interface AnomalyModalProps {
  selectedAnomaly: {
    dataKey: string;
    date: string;
    value: number;
    prevValue: number;
    changeRate: number;
  } | null;
  onClose: () => void;
}

export default function AnomalyModal({ selectedAnomaly, onClose }: AnomalyModalProps) {
  const locale = useLocale();

  if (!selectedAnomaly) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white border border-gray-200 max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">
              {isChineseLocale(locale) ? '数据异常检测' : 'Anomaly Detected'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-600 mb-1">
              {isChineseLocale(locale) ? '检测到异常波动' : 'Abnormal fluctuation detected'}
            </p>
            <p className="text-2xl font-bold text-red-700">
              {(selectedAnomaly.changeRate * 100).toFixed(2)}%
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">
                {isChineseLocale(locale) ? '预言机' : 'Oracle'}
              </p>
              <p className="font-medium text-gray-900">{selectedAnomaly.dataKey}</p>
            </div>
            <div className="bg-gray-50 p-3 border border-gray-200">
              <p className="text-xs text-gray-500 mb-1">
                {isChineseLocale(locale) ? '日期' : 'Date'}
              </p>
              <p className="font-medium text-gray-900">{selectedAnomaly.date}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">
                {isChineseLocale(locale) ? '当前值' : 'Current Value'}
              </span>
              <span className="font-medium text-gray-900">
                ${selectedAnomaly.value.toFixed(2)}B
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">
                {isChineseLocale(locale) ? '上一期值' : 'Previous Value'}
              </span>
              <span className="font-medium text-gray-900">
                ${selectedAnomaly.prevValue.toFixed(2)}B
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">
                {isChineseLocale(locale) ? '变化量' : 'Change'}
              </span>
              <span
                className={`font-medium ${
                  selectedAnomaly.value > selectedAnomaly.prevValue
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {selectedAnomaly.value > selectedAnomaly.prevValue ? '+' : ''}
                {(selectedAnomaly.value - selectedAnomaly.prevValue).toFixed(2)}B
              </span>
            </div>
          </div>

          <div className="bg-amber-50 p-3 border border-amber-200">
            <p className="text-xs text-amber-700">
              {isChineseLocale(locale)
                ? '该数据点的变化率超过了设定的阈值，可能存在异常波动。建议进一步调查原因。'
                : 'This data point exceeds the configured threshold. Further investigation is recommended.'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            {isChineseLocale(locale) ? '关闭' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
