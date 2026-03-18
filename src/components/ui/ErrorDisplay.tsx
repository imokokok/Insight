'use client';

import React, { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Bug, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorSuggestion {
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
}

export interface ErrorDetails {
  title: string;
  message: string;
  code?: string;
  severity: ErrorSeverity;
  cause?: string;
  suggestions: ErrorSuggestion[];
  technicalDetails?: string;
  timestamp: Date;
  recoverable: boolean;
}

interface ErrorDisplayProps {
  error: Error | ErrorDetails | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  onReport?: (error: ErrorDetails) => void;
  showReportButton?: boolean;
  className?: string;
  compact?: boolean;
}

const severityConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-900',
    messageColor: 'text-red-700',
    buttonBg: 'bg-red-600',
    buttonHover: 'hover:bg-red-700',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-900',
    messageColor: 'text-yellow-700',
    buttonBg: 'bg-yellow-600',
    buttonHover: 'hover:bg-yellow-700',
  },
  info: {
    icon: AlertCircle,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-900',
    messageColor: 'text-blue-700',
    buttonBg: 'bg-blue-600',
    buttonHover: 'hover:bg-blue-700',
  },
};

function isErrorDetails(error: Error | ErrorDetails): error is ErrorDetails {
  return 'suggestions' in error && 'severity' in error;
}

function convertErrorToDetails(error: Error, t: (key: string) => string): ErrorDetails {
  const isNetworkError = error.message.includes('network') || error.message.includes('fetch');
  const isTimeoutError = error.message.includes('timeout') || error.message.includes('ETIMEDOUT');
  const isAuthError = error.message.includes('auth') || error.message.includes('unauthorized');

  let suggestions: ErrorSuggestion[] = [];

  if (isNetworkError) {
    suggestions = [
      {
        title: t('error.suggestions.checkConnection.title'),
        description: t('error.suggestions.checkConnection.description'),
      },
      {
        title: t('error.suggestions.retryLater.title'),
        description: t('error.suggestions.retryLater.description'),
      },
    ];
  } else if (isTimeoutError) {
    suggestions = [
      {
        title: t('error.suggestions.slowNetwork.title'),
        description: t('error.suggestions.slowNetwork.description'),
      },
      {
        title: t('error.suggestions.reduceData.title'),
        description: t('error.suggestions.reduceData.description'),
      },
    ];
  } else if (isAuthError) {
    suggestions = [
      {
        title: t('error.suggestions.relogin.title'),
        description: t('error.suggestions.relogin.description'),
      },
    ];
  } else {
    suggestions = [
      {
        title: t('error.suggestions.refreshPage.title'),
        description: t('error.suggestions.refreshPage.description'),
      },
      {
        title: t('error.suggestions.contactSupport.title'),
        description: t('error.suggestions.contactSupport.description'),
      },
    ];
  }

  return {
    title: t('error.defaultTitle'),
    message: error.message,
    severity: 'error',
    cause: error.cause instanceof Error ? error.cause.message : undefined,
    suggestions,
    technicalDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date(),
    recoverable: true,
  };
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  onReport,
  showReportButton = true,
  className = '',
  compact = false,
}: ErrorDisplayProps) {
  const t = useTranslations();
  const [showDetails, setShowDetails] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  if (!error) return null;

  const details = isErrorDetails(error) ? error : convertErrorToDetails(error, t);
  const config = severityConfig[details.severity];
  const Icon = config.icon;

  const handleReport = useCallback(async () => {
    if (!onReport) return;
    setIsReporting(true);
    try {
      await onReport(details);
    } finally {
      setIsReporting(false);
    }
  }, [onReport, details]);

  if (compact) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={`${config.bgColor} ${config.borderColor} border p-3 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${config.iconColor}`} aria-hidden="true" />
          <span className={`text-sm font-medium ${config.titleColor}`}>{details.title}</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className={`ml-auto p-1 ${config.iconColor} hover:opacity-70 transition-opacity`}
              aria-label={t('common.actions.retry')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      role="alert"
      aria-live="assertive"
      className={`${config.bgColor} ${config.borderColor} border ${className}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold ${config.titleColor}`}>{details.title}</h3>

            {details.code && (
              <p className="text-xs text-gray-500 mt-1" aria-label={t('error.errorCode')}>
                {t('error.errorCode')}: {details.code}
              </p>
            )}

            <p className={`text-sm ${config.messageColor} mt-2`}>{details.message}</p>

            {details.cause && (
              <p className="text-xs text-gray-500 mt-1">
                {t('error.cause')}: {details.cause}
              </p>
            )}

            {details.suggestions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  {t('error.suggestedActions')}
                </h4>
                <ul className="space-y-2">
                  {details.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-gray-400 mt-0.5">•</span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">{suggestion.title}</p>
                        <p className="text-xs text-gray-500">{suggestion.description}</p>
                        {suggestion.action && suggestion.actionLabel && (
                          <button
                            onClick={suggestion.action}
                            className="text-xs text-blue-600 hover:text-blue-700 underline mt-1"
                          >
                            {suggestion.actionLabel}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <AnimatePresence>
              {showDetails && details.technicalDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-3 bg-gray-100  font-mono text-xs text-gray-700 overflow-auto max-h-40">
                    <pre>{details.technicalDetails}</pre>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={t('common.actions.close')}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          {details.recoverable && onRetry && (
            <button
              onClick={onRetry}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium ${config.buttonBg} ${config.buttonHover} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${details.severity}-500`}
            >
              <RefreshCw className="w-4 h-4" aria-hidden="true" />
              {t('common.actions.retry')}
            </button>
          )}

          {showReportButton && onReport && (
            <button
              onClick={handleReport}
              disabled={isReporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Bug className="w-4 h-4" aria-hidden="true" />
              {isReporting ? t('error.reporting') : t('error.report')}
            </button>
          )}

          {details.technicalDetails && (
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              aria-expanded={showDetails}
              aria-controls="error-technical-details"
            >
              <FileText className="w-4 h-4" aria-hidden="true" />
              {showDetails ? t('error.hideDetails') : t('error.showDetails')}
              {showDetails ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          {t('error.timestamp')}: {details.timestamp.toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}

export function ErrorBoundaryFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  const t = useTranslations();

  const details = convertErrorToDetails(error, t);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <ErrorDisplay
          error={details}
          onRetry={resetErrorBoundary}
          showReportButton={true}
          onReport={async (err) => {
            console.error('Error reported:', err);
          }}
        />
      </div>
    </div>
  );
}

export function InlineError({
  message,
  onRetry,
  className = '',
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useTranslations();

  return (
    <div
      role="alert"
      className={`flex items-center gap-2 text-red-600 text-sm ${className}`}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 text-red-600 hover:text-red-700 underline"
        >
          <RefreshCw className="w-3 h-3" />
          {t('common.actions.retry')}
        </button>
      )}
    </div>
  );
}

export function FormError({
  errors,
  className = '',
}: {
  errors: Record<string, string | undefined>;
  className?: string;
}) {
  const t = useTranslations();
  const errorEntries = Object.entries(errors).filter(([, value]) => value);

  if (errorEntries.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`bg-red-50 border border-red-200 p-3 ${className}`}
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-900">
            {t('error.formValidation.title')}
          </h4>
          <ul className="mt-1 space-y-1">
            {errorEntries.map(([field, message]) => (
              <li key={field} className="text-sm text-red-700">
                <span className="font-medium">{field}:</span> {message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
