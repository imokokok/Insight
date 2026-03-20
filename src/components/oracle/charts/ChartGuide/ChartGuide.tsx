'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { baseColors, semanticColors } from '@/lib/config/colors';

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export interface ChartGuideProps {
  chartId: string;
  onClose?: () => void;
  className?: string;
}

const GUIDE_STORAGE_KEY = 'chart_guide_dismissed';

export function ChartGuide({ chartId, onClose, className = '' }: ChartGuideProps) {
  const t = useTranslations('chartGuide');
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const guideSteps: GuideStep[] = [
    {
      id: 'zoom',
      title: t('steps.zoom.title'),
      description: t('steps.zoom.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
          />
        </svg>
      ),
      position: 'bottom',
    },
    {
      id: 'fullscreen',
      title: t('steps.fullscreen.title'),
      description: t('steps.fullscreen.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      ),
      position: 'bottom',
    },
    {
      id: 'hover',
      title: t('steps.hover.title'),
      description: t('steps.hover.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
      ),
      position: 'bottom',
    },
    {
      id: 'indicators',
      title: t('steps.indicators.title'),
      description: t('steps.indicators.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      position: 'bottom',
    },
    {
      id: 'export',
      title: t('steps.export.title'),
      description: t('steps.export.description'),
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
      ),
      position: 'bottom',
    },
  ];

  useEffect(() => {
    const checkVisibility = () => {
      try {
        const dismissedGuides = JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY) || '{}');
        if (!dismissedGuides[chartId]) {
          setIsVisible(true);
          setIsAnimating(true);
        }
      } catch {
        setIsVisible(true);
        setIsAnimating(true);
      }
    };

    const timer = setTimeout(checkVisibility, 1000);
    return () => clearTimeout(timer);
  }, [chartId]);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300);
  }, [onClose]);

  const handleDontShowAgain = useCallback(() => {
    setDontShowAgain(!dontShowAgain);
  }, [dontShowAgain]);

  const handleComplete = useCallback(() => {
    if (dontShowAgain) {
      try {
        const dismissedGuides = JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY) || '{}');
        dismissedGuides[chartId] = true;
        localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(dismissedGuides));
      } catch {
        // Silently fail if localStorage is not available
      }
    }
    handleClose();
  }, [chartId, dontShowAgain, handleClose]);

  const handleNext = useCallback(() => {
    if (currentStep < guideSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, guideSteps.length, handleComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const resetGuide = useCallback(() => {
    try {
      const dismissedGuides = JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY) || '{}');
      delete dismissedGuides[chartId];
      localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(dismissedGuides));
    } catch {
      // Silently fail if localStorage is not available
    }
    setCurrentStep(0);
    setDontShowAgain(false);
    setIsVisible(true);
    setIsAnimating(true);
  }, [chartId]);

  if (!isVisible) {
    return null;
  }

  const currentGuideStep = guideSteps[currentStep];
  const progress = ((currentStep + 1) / guideSteps.length) * 100;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transition-all duration-300 ${
          isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25)`,
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: baseColors.gray[200] }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: baseColors.primary[50] }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke={baseColors.primary[600]}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: baseColors.gray[900] }}>
                {t('title')}
              </h3>
              <p className="text-xs" style={{ color: baseColors.gray[500] }}>
                {t('stepCounter', { current: currentStep + 1, total: guideSteps.length })}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            title={t('close')}
          >
            <svg className="w-5 h-5" fill="none" stroke={baseColors.gray[400]} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-100">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              backgroundColor: baseColors.primary[500],
            }}
          />
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <div className="flex items-start gap-4">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: baseColors.primary[50],
                color: baseColors.primary[600],
              }}
            >
              {currentGuideStep.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h4
                className="font-semibold text-lg mb-2 transition-all duration-300"
                style={{ color: baseColors.gray[900] }}
              >
                {currentGuideStep.title}
              </h4>
              <p
                className="text-sm leading-relaxed transition-all duration-300"
                style={{ color: baseColors.gray[600] }}
              >
                {currentGuideStep.description}
              </p>
            </div>
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {guideSteps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className="w-2 h-2 rounded-full transition-all duration-200"
                style={{
                  backgroundColor:
                    index === currentStep
                      ? baseColors.primary[500]
                      : index < currentStep
                        ? baseColors.primary[300]
                        : baseColors.gray[300],
                  transform: index === currentStep ? 'scale(1.25)' : 'scale(1)',
                }}
                title={`${t('step')} ${index + 1}: ${step.title}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ borderColor: baseColors.gray[200] }}
        >
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dontShowAgain"
              checked={dontShowAgain}
              onChange={handleDontShowAgain}
              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="dontShowAgain"
              className="text-sm cursor-pointer select-none"
              style={{ color: baseColors.gray[600] }}
            >
              {t('dontShowAgain')}
            </label>
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                style={{
                  color: baseColors.gray[600],
                  backgroundColor: baseColors.gray[100],
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.gray[200];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = baseColors.gray[100];
                }}
              >
                {t('previous')}
              </button>
            )}
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                color: baseColors.gray[500],
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = baseColors.gray[700];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = baseColors.gray[500];
              }}
            >
              {t('skip')}
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{
                color: '#ffffff',
                backgroundColor: baseColors.primary[600],
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = baseColors.primary[700];
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = baseColors.primary[600];
              }}
            >
              {currentStep === guideSteps.length - 1 ? t('finish') : t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook to check if guide should be shown
export function useChartGuide(chartId: string) {
  const [shouldShowGuide, setShouldShowGuide] = useState(false);

  useEffect(() => {
    try {
      const dismissedGuides = JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY) || '{}');
      setShouldShowGuide(!dismissedGuides[chartId]);
    } catch {
      setShouldShowGuide(true);
    }
  }, [chartId]);

  const resetGuide = useCallback(() => {
    try {
      const dismissedGuides = JSON.parse(localStorage.getItem(GUIDE_STORAGE_KEY) || '{}');
      delete dismissedGuides[chartId];
      localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(dismissedGuides));
      setShouldShowGuide(true);
    } catch {
      setShouldShowGuide(true);
    }
  }, [chartId]);

  return { shouldShowGuide, resetGuide };
}

export default ChartGuide;
