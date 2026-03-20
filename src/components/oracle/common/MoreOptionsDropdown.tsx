'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';

type ConfidenceLevel = 90 | 95 | 99;

interface MoreOptionsDropdownProps {
  showComparisonPanel: boolean;
  comparisonEnabled: boolean;
  anomalyDetectionEnabled: boolean;
  showPredictionInterval: boolean;
  confidenceLevel: ConfidenceLevel;
  anomaliesCount: number;
  onToggleComparison: () => void;
  onToggleAnomalyDetection: () => void;
  onTogglePredictionInterval: () => void;
  onConfidenceLevelChange: (level: ConfidenceLevel) => void;
  onShowAnomalyStats: () => void;
  compact?: boolean;
}

export function MoreOptionsDropdown({
  showComparisonPanel,
  comparisonEnabled,
  anomalyDetectionEnabled,
  showPredictionInterval,
  confidenceLevel,
  anomaliesCount,
  onToggleComparison,
  onToggleAnomalyDetection,
  onTogglePredictionInterval,
  onConfidenceLevelChange,
  onShowAnomalyStats,
  compact = false,
}: MoreOptionsDropdownProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [showConfidenceSubmenu, setShowConfidenceSubmenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowConfidenceSubmenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = (callback: () => void) => {
    callback();
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2  transition-colors ${
            isOpen || anomalyDetectionEnabled || showPredictionInterval || comparisonEnabled
              ? 'bg-primary-100 text-primary-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={t('priceChart.moreOptions')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 top-full mt-1 w-56 bg-white   border border-gray-200 py-1 z-50">
            <button
              onClick={() => handleToggle(onToggleComparison)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                comparisonEnabled || showComparisonPanel
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                {t('priceChart.timeComparison')}
              </span>
              {(comparisonEnabled || showComparisonPanel) && (
                <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            <button
              onClick={() => handleToggle(onToggleAnomalyDetection)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                anomalyDetectionEnabled
                  ? 'text-danger-600 bg-danger-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {t('priceChart.anomalyDetection')}
                {anomalyDetectionEnabled && anomaliesCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-danger-500 text-white  text-xs">
                    {anomaliesCount}
                  </span>
                )}
              </span>
              {anomalyDetectionEnabled && (
                <svg className="w-4 h-4 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {anomalyDetectionEnabled && anomaliesCount > 0 && (
              <button
                onClick={() => {
                  onShowAnomalyStats();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 pl-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                {t('priceChart.viewStats')}
              </button>
            )}

            <button
              onClick={() => handleToggle(onTogglePredictionInterval)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between ${
                showPredictionInterval
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                {t('priceChart.predictionInterval')}
              </span>
              {showPredictionInterval && (
                <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>

            {showPredictionInterval && (
              <div className="border-t border-gray-100 mt-1 pt-1">
                <div className="px-4 py-2 text-xs text-gray-500 font-medium">
                  {t('priceChart.confidence')}
                </div>
                {([90, 95, 99] as ConfidenceLevel[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => onConfidenceLevelChange(level)}
                    className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between ${
                      confidenceLevel === level
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="pl-6">{level}%</span>
                    {confidenceLevel === level && (
                      <svg
                        className="w-4 h-4 text-primary-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`px-3 py-1.5 text-xs font-medium  border transition-colors flex items-center gap-1 ${
          isOpen || anomalyDetectionEnabled || showPredictionInterval || comparisonEnabled
            ? 'bg-primary-50 text-primary-600 border-primary-200'
            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
        {t('priceChart.more')}
        {(anomalyDetectionEnabled || showPredictionInterval || comparisonEnabled) && (
          <span className="ml-1 w-1.5 h-1.5 bg-primary-500 " />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white   border border-gray-200 py-2 z-50">
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">
              {t('priceChart.advancedFeatures')}
            </h3>
          </div>

          <div className="py-1">
            <button
              onClick={() => handleToggle(onToggleComparison)}
              className={`w-full px-4 py-2.5 text-left transition-colors ${
                comparisonEnabled || showComparisonPanel
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8  flex items-center justify-center ${
                      comparisonEnabled || showComparisonPanel ? 'bg-purple-100' : 'bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${
                        comparisonEnabled || showComparisonPanel
                          ? 'text-purple-600'
                          : 'text-gray-600'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium">{t('priceChart.timeComparison')}</span>
                    <p className="text-xs text-gray-500">
                      {t('priceChart.timeComparisonDescription')}
                    </p>
                  </div>
                </div>
                {(comparisonEnabled || showComparisonPanel) && (
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>

            <button
              onClick={() => handleToggle(onToggleAnomalyDetection)}
              className={`w-full px-4 py-2.5 text-left transition-colors ${
                anomalyDetectionEnabled
                  ? 'text-danger-600 bg-danger-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8  flex items-center justify-center ${
                      anomalyDetectionEnabled ? 'bg-danger-100' : 'bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${anomalyDetectionEnabled ? 'text-danger-600' : 'text-gray-600'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium">{t('priceChart.anomalyDetection')}</span>
                    <p className="text-xs text-gray-500">
                      {t('priceChart.anomalyDetectionDescription')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {anomalyDetectionEnabled && anomaliesCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-danger-500 text-white  text-xs">
                      {anomaliesCount}
                    </span>
                  )}
                  {anomalyDetectionEnabled && (
                    <svg className="w-5 h-5 text-danger-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </button>

            {anomalyDetectionEnabled && anomaliesCount > 0 && (
              <button
                onClick={() => {
                  onShowAnomalyStats();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <span className="w-8" />
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                {t('priceChart.viewAnomalyStats')}
              </button>
            )}

            <button
              onClick={() => handleToggle(onTogglePredictionInterval)}
              className={`w-full px-4 py-2.5 text-left transition-colors ${
                showPredictionInterval
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8  flex items-center justify-center ${
                      showPredictionInterval ? 'bg-primary-100' : 'bg-gray-100'
                    }`}
                  >
                    <svg
                      className={`w-4 h-4 ${showPredictionInterval ? 'text-primary-600' : 'text-gray-600'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium">{t('priceChart.predictionInterval')}</span>
                    <p className="text-xs text-gray-500">
                      {t('priceChart.predictionIntervalDescription')}
                    </p>
                  </div>
                </div>
                {showPredictionInterval && (
                  <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>

            {showPredictionInterval && (
              <div className="mt-1 px-4 py-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 font-medium mb-2">
                  {t('priceChart.confidenceSelection')}
                </div>
                <div className="flex items-center gap-2">
                  {([90, 95, 99] as ConfidenceLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => onConfidenceLevelChange(level)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        confidenceLevel === level
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {level}%
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
