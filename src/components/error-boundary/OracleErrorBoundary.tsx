'use client';

import { type ReactNode } from 'react';

import { ErrorBoundary, type ErrorBoundaryProps } from './ErrorBoundary';

interface OracleErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: ErrorBoundaryProps['onError'];
  themeColor?: string;
  componentName?: string;
}

function OracleErrorBoundary({
  children,
  fallback,
  onReset,
  onError,
  themeColor = 'blue',
  componentName,
}: OracleErrorBoundaryProps) {
  return (
    <ErrorBoundary
      level="section"
      fallback={fallback}
      onReset={onReset}
      onError={onError}
      themeColor={themeColor}
      componentName={componentName}
      captureInSentry={false}
    >
      {children}
    </ErrorBoundary>
  );
}
