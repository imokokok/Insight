'use client';

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Sparkles,
  Lightbulb,
  Target,
  BookOpen,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

// ============================================
// 教程上下文和 Hook
// ============================================

export interface TutorialContextType {
  currentStep: number;
  totalSteps: number;
  isActive: boolean;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  goToStep: (step: number) => void;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}

// ============================================
// 本地存储管理
// ============================================

const TUTORIAL_STORAGE_KEY = 'tutorial_progress';

interface TutorialProgress {
  completedTutorials: string[];
  currentTutorial?: {
    id: string;
    step: number;
    completedAt?: string;
  };
  skippedTutorials: string[];
  neverShowAgain: boolean;
}

function getStoredProgress(): TutorialProgress {
  if (typeof window === 'undefined') {
    return { completedTutorials: [], skippedTutorials: [], neverShowAgain: false };
  }
  try {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parsing errors
  }
  return { completedTutorials: [], skippedTutorials: [], neverShowAgain: false };
}

function saveProgress(progress: TutorialProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
}

export function useTutorialStorage(tutorialId: string) {
  const getProgress = useCallback(() => {
    const progress = getStoredProgress();
    return {
      isCompleted: progress.completedTutorials.includes(tutorialId),
      isSkipped: progress.skippedTutorials.includes(tutorialId),
      currentStep: progress.currentTutorial?.id === tutorialId ? progress.currentTutorial.step : 0,
      neverShowAgain: progress.neverShowAgain,
    };
  }, [tutorialId]);

  const markCompleted = useCallback(() => {
    const progress = getStoredProgress();
    if (!progress.completedTutorials.includes(tutorialId)) {
      progress.completedTutorials.push(tutorialId);
    }
    progress.currentTutorial = undefined;
    saveProgress(progress);
  }, [tutorialId]);

  const markSkipped = useCallback(() => {
    const progress = getStoredProgress();
    if (!progress.skippedTutorials.includes(tutorialId)) {
      progress.skippedTutorials.push(tutorialId);
    }
    progress.currentTutorial = undefined;
    saveProgress(progress);
  }, [tutorialId]);

  const saveCurrentStep = useCallback(
    (step: number) => {
      const progress = getStoredProgress();
      progress.currentTutorial = {
        id: tutorialId,
        step,
      };
      saveProgress(progress);
    },
    [tutorialId]
  );

  const resetProgress = useCallback(() => {
    const progress = getStoredProgress();
    progress.completedTutorials = progress.completedTutorials.filter((id) => id !== tutorialId);
    progress.skippedTutorials = progress.skippedTutorials.filter((id) => id !== tutorialId);
    if (progress.currentTutorial?.id === tutorialId) {
      progress.currentTutorial = undefined;
    }
    saveProgress(progress);
  }, [tutorialId]);

  const setNeverShowAgain = useCallback((value: boolean) => {
    const progress = getStoredProgress();
    progress.neverShowAgain = value;
    saveProgress(progress);
  }, []);

  return {
    getProgress,
    markCompleted,
    markSkipped,
    saveCurrentStep,
    resetProgress,
    setNeverShowAgain,
  };
}

// ============================================
// 教程步骤类型
// ============================================

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  content?: React.ReactNode;
  image?: string;
  video?: string;
  icon?: React.ReactNode;
  targetSelector?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: {
    label: string;
    onClick: () => void;
  };
  allowSkip?: boolean;
}

// ============================================
// 教程卡片组件
// ============================================

interface TutorialCardProps {
  step: TutorialStep;
  stepNumber: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  className?: string;
}

export function TutorialCard({
  step,
  stepNumber,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isFirstStep,
  isLastStep,
  className,
}: TutorialCardProps) {
  const t = useTranslations('tutorial');
  const progress = ((stepNumber + 1) / totalSteps) * 100;

  return (
    <div
      className={cn(
        'bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-w-md w-full',
        className
      )}
    >
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-medium bg-primary-100 text-primary-700 rounded-full">
            {stepNumber + 1} / {totalSteps}
          </span>
          {step.allowSkip !== false && (
            <button
              onClick={onSkip}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              {t('skip')}
            </button>
          )}
        </div>
        <button
          onClick={onSkip}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          aria-label={t('close')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Icon */}
        {step.icon && (
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary-50 rounded-xl text-primary-600">{step.icon}</div>
          </div>
        )}

        {/* Image */}
        {step.image && (
          <div className="mb-4 rounded-xl overflow-hidden bg-gray-100">
            <img src={step.image} alt={step.title} className="w-full h-40 object-cover" />
          </div>
        )}

        {/* Video */}
        {step.video && (
          <div className="mb-4 rounded-xl overflow-hidden bg-gray-900">
            <video src={step.video} className="w-full h-40" controls={false} autoPlay loop muted />
          </div>
        )}

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 text-center mb-2">{step.title}</h3>

        {/* Description */}
        <p className="text-gray-600 text-center mb-4">{step.description}</p>

        {/* Custom Content */}
        {step.content && <div className="mb-4">{step.content}</div>}

        {/* Step Action */}
        {step.action && (
          <button
            onClick={step.action.onClick}
            className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors mb-4"
          >
            {step.action.label}
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-6">
        <div className="flex items-center gap-3">
          {!isFirstStep && (
            <button
              onClick={onPrev}
              className="flex items-center justify-center w-12 h-12 border-2 border-gray-200 text-gray-600 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label={t('previous')}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={onComplete}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-200"
            >
              <Check className="w-5 h-5" />
              {t('complete')}
            </button>
          ) : (
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              {t('next')}
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {[...Array(totalSteps)].map((_, i) => (
            <button
              key={i}
              onClick={() => {}}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === stepNumber ? 'w-6 bg-primary-600' : 'bg-gray-300 hover:bg-gray-400'
              )}
              aria-label={t('goToStep', { step: i + 1 })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 步骤引导组件（Spotlight）
// ============================================

interface TutorialSpotlightProps {
  targetSelector: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  onNext: () => void;
  onPrev?: () => void;
  onSkip: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  stepNumber: number;
  totalSteps: number;
}

export function TutorialSpotlight({
  targetSelector,
  title,
  description,
  placement = 'bottom',
  onNext,
  onPrev,
  onSkip,
  isFirst,
  isLast,
  stepNumber,
  totalSteps,
}: TutorialSpotlightProps) {
  const t = useTranslations('tutorial');
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updatePosition = () => {
      const target = document.querySelector(targetSelector);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);

        let top = 0;
        let left = 0;

        switch (placement) {
          case 'top':
            top = rect.top - 20;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + 20;
            left = rect.left + rect.width / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2;
            left = rect.left - 20;
            break;
          case 'right':
            top = rect.top + rect.height / 2;
            left = rect.right + 20;
            break;
        }

        setPosition({ top, left });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [targetSelector, placement]);

  if (!position || !targetRect) return null;

  const getTooltipStyles = () => {
    const base = {
      position: 'fixed' as const,
      zIndex: 100,
    };

    switch (placement) {
      case 'top':
        return {
          ...base,
          bottom: `${window.innerHeight - position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...base,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          ...base,
          top: `${position.top}px`,
          right: `${window.innerWidth - position.left}px`,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          ...base,
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateY(-50%)',
        };
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-50">
        {/* Dark overlay with cutout */}
        <div
          className="absolute inset-0 bg-black/50"
          style={{
            clipPath: targetRect
              ? `polygon(
                  0% 0%,
                  0% 100%,
                  ${targetRect.left}px 100%,
                  ${targetRect.left}px ${targetRect.top}px,
                  ${targetRect.right}px ${targetRect.top}px,
                  ${targetRect.right}px ${targetRect.bottom}px,
                  ${targetRect.left}px ${targetRect.bottom}px,
                  ${targetRect.left}px 100%,
                  100% 100%,
                  100% 0%
                )`
              : undefined,
          }}
        />
        {/* Highlight border */}
        <div
          className="absolute border-2 border-primary-500 rounded-lg pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
          }}
        />
      </div>

      {/* Tooltip */}
      <div style={getTooltipStyles()}>
        <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-5 max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-primary-600">
              {stepNumber + 1} / {totalSteps}
            </span>
            <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600">
              {t('skip')}
            </button>
          </div>

          <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
          <p className="text-sm text-gray-600 mb-4">{description}</p>

          <div className="flex items-center gap-2">
            {!isFirst && onPrev && (
              <button
                onClick={onPrev}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onNext}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isLast ? t('finish') : t('next')}
              {!isLast && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================
// 教程管理器组件
// ============================================

interface TutorialManagerProps {
  tutorialId: string;
  steps: TutorialStep[];
  children: React.ReactNode;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
  showWelcome?: boolean;
  welcomeTitle?: string;
  welcomeDescription?: string;
}

export function TutorialManager({
  tutorialId,
  steps,
  children,
  onComplete,
  onSkip,
  autoStart = false,
  showWelcome = true,
  welcomeTitle,
  welcomeDescription,
}: TutorialManagerProps) {
  const t = useTranslations('tutorial');
  const storage = useTutorialStorage(tutorialId);
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showWelcomeCard, setShowWelcomeCard] = useState(false);

  useEffect(() => {
    const progress = storage.getProgress();
    if (progress.isCompleted || progress.isSkipped || progress.neverShowAgain) {
      return;
    }

    // Use requestAnimationFrame to avoid synchronous setState in effect
    const timer = requestAnimationFrame(() => {
      if (autoStart) {
        setIsActive(true);
        setCurrentStep(progress.currentStep);
      } else if (showWelcome) {
        setShowWelcomeCard(true);
      }
    });

    return () => cancelAnimationFrame(timer);
  }, [storage, autoStart, showWelcome]);

  const startTutorial = useCallback(() => {
    setShowWelcomeCard(false);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      storage.saveCurrentStep(next);
    }
  }, [currentStep, steps.length, storage]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      storage.saveCurrentStep(prev);
    }
  }, [currentStep, storage]);

  const skipTutorial = useCallback(() => {
    setIsActive(false);
    setShowWelcomeCard(false);
    storage.markSkipped();
    onSkip?.();
  }, [storage, onSkip]);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    storage.markCompleted();
    onComplete?.();
  }, [storage, onComplete]);

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < steps.length) {
        setCurrentStep(step);
        storage.saveCurrentStep(step);
      }
    },
    [steps.length, storage]
  );

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <TutorialContext.Provider
      value={{
        currentStep,
        totalSteps: steps.length,
        isActive,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        goToStep,
      }}
    >
      {children}

      {/* Welcome Card */}
      {showWelcomeCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 text-center mb-3">
              {welcomeTitle || t('welcomeTitle')}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {welcomeDescription || t('welcomeDescription')}
            </p>

            <div className="space-y-3">
              <button
                onClick={startTutorial}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                <BookOpen className="w-5 h-5" />
                {t('startTutorial')}
              </button>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={skipTutorial}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t('skipForNow')}
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={() => {
                    storage.setNeverShowAgain(true);
                    skipTutorial();
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {t('dontShowAgain')}
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Target className="w-4 h-4" />
                  <span>
                    {steps.length} {t('steps')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>{t('interactive')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Active Tutorial */}
      {isActive && currentStepData && (
        <>
          {currentStepData.targetSelector ? (
            <TutorialSpotlight
              targetSelector={currentStepData.targetSelector}
              title={currentStepData.title}
              description={currentStepData.description}
              placement={currentStepData.placement === 'center' ? 'top' : currentStepData.placement}
              onNext={isLastStep ? completeTutorial : nextStep}
              onPrev={!isFirstStep ? prevStep : undefined}
              onSkip={skipTutorial}
              isFirst={isFirstStep}
              isLast={isLastStep}
              stepNumber={currentStep}
              totalSteps={steps.length}
            />
          ) : (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <TutorialCard
                step={currentStepData}
                stepNumber={currentStep}
                totalSteps={steps.length}
                onNext={nextStep}
                onPrev={prevStep}
                onSkip={skipTutorial}
                onComplete={completeTutorial}
                isFirstStep={isFirstStep}
                isLastStep={isLastStep}
              />
            </div>
          )}
        </>
      )}
    </TutorialContext.Provider>
  );
}

// ============================================
// 教程触发器组件
// ============================================

interface TutorialTriggerProps {
  tutorialId: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'button' | 'link' | 'icon';
}

export function TutorialTrigger({
  tutorialId,
  children,
  onClick,
  className,
  variant = 'button',
}: TutorialTriggerProps) {
  const storage = useTutorialStorage(tutorialId);

  const handleClick = () => {
    storage.resetProgress();
    onClick?.();
  };

  const variantClasses = {
    button:
      'inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors',
    link: 'inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors',
    icon: 'p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors',
  };

  return (
    <button onClick={handleClick} className={cn(variantClasses[variant], className)}>
      {variant === 'icon' ? <RotateCcw className="w-5 h-5" /> : children}
      {variant === 'button' && <ArrowRight className="w-4 h-4" />}
    </button>
  );
}

// ============================================
// 教程完成庆祝组件
// ============================================

interface TutorialCompletionProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  onViewSummary?: () => void;
  onStartUsing?: () => void;
}

export function TutorialCompletion({
  isOpen,
  onClose,
  title,
  description,
  onViewSummary,
  onStartUsing,
}: TutorialCompletionProps) {
  const t = useTranslations('tutorial');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
        {/* Celebration Animation */}
        <div className="relative flex justify-center mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full opacity-20 animate-ping" />
          </div>
          <div className="relative p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg shadow-blue-200">
            <Check className="w-12 h-12 text-white" />
          </div>
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3">{title || t('completionTitle')}</h3>
        <p className="text-gray-600 mb-6">{description || t('completionDescription')}</p>

        <div className="space-y-3">
          {onStartUsing && (
            <button
              onClick={onStartUsing}
              className="w-full py-3 px-6 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
            >
              {t('startUsing')}
            </button>
          )}
          {onViewSummary && (
            <button
              onClick={onViewSummary}
              className="w-full py-3 px-6 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              {t('viewSummary')}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-3 px-6 text-gray-500 hover:text-gray-700 transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 预定义的教程步骤
// ============================================

export const createOnboardingSteps = (t: (key: string) => string): TutorialStep[] => [
  {
    id: 'welcome',
    title: t('steps.welcome.title'),
    description: t('steps.welcome.description'),
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    id: 'explore',
    title: t('steps.explore.title'),
    description: t('steps.explore.description'),
    icon: <Target className="w-6 h-6" />,
  },
  {
    id: 'analyze',
    title: t('steps.analyze.title'),
    description: t('steps.analyze.description'),
    icon: <BookOpen className="w-6 h-6" />,
  },
  {
    id: 'customize',
    title: t('steps.customize.title'),
    description: t('steps.customize.description'),
    icon: <Lightbulb className="w-6 h-6" />,
  },
];
