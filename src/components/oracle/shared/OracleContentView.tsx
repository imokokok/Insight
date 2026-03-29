'use client';

import { Suspense, lazy, useMemo, type ComponentType, type ReactNode, memo } from 'react';

import { type OracleConfig, type OracleViewConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

import { LoadingState } from './LoadingState';
import { OracleErrorBoundary } from './OracleErrorBoundary';

export interface ContentViewNetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency?: number;
  hourlyActivity?: number[];
  status?: string;
  totalStaked?: number;
  updateFrequency?: number;
}

export interface PublisherData {
  id: string;
  name: string;
  status?: string;
  contribution?: number;
  accuracy: number;
  stake?: number;
}

export interface ValidatorData {
  id: string;
  name: string;
  stake?: number;
  performance?: number;
  status: string;
  uptime?: number;
  rewards?: number;
}

export interface OracleContentViewProps {
  config: OracleConfig;
  activeTab: string;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: ContentViewNetworkStats | null;
  isLoading: boolean;
  publishers?: PublisherData[];
  validators?: ValidatorData[];
  customData?: Record<string, unknown>;
  themeColor?: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: { componentStack: string }) => void;
}

interface ViewComponentProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats: ContentViewNetworkStats | null;
  publishers?: PublisherData[];
  validators?: ValidatorData[];
  customData?: Record<string, unknown>;
}

type ViewComponent = ComponentType<ViewComponentProps>;

const viewRegistry: Record<string, ViewComponent> = {};

const lazyViewRegistry: Record<string, React.LazyExoticComponent<ViewComponent>> = {};

export function registerView(viewId: string, component: ViewComponent): void {
  viewRegistry[viewId] = component;
}

export function registerLazyView(
  viewId: string,
  componentLoader: () => Promise<{ default: ViewComponent }>
): void {
  lazyViewRegistry[viewId] = lazy(componentLoader);
}

export function getRegisteredView(viewId: string): ViewComponent | undefined {
  return viewRegistry[viewId];
}

export function getLazyView(viewId: string): React.LazyExoticComponent<ViewComponent> | undefined {
  return lazyViewRegistry[viewId];
}

export function hasView(viewId: string): boolean {
  return viewId in viewRegistry || viewId in lazyViewRegistry;
}

function getViewComponent(
  viewId: string,
  viewConfig?: OracleViewConfig
): ViewComponent | React.LazyExoticComponent<ViewComponent> | null {
  if (viewRegistry[viewId]) {
    return viewRegistry[viewId];
  }

  if (lazyViewRegistry[viewId]) {
    return lazyViewRegistry[viewId];
  }

  if (viewConfig?.component) {
    const componentName = viewConfig.component;
    if (viewRegistry[componentName]) {
      return viewRegistry[componentName];
    }
    if (lazyViewRegistry[componentName]) {
      return lazyViewRegistry[componentName];
    }
  }

  return null;
}

const DefaultViewFallback = memo(function DefaultViewFallback({
  viewId,
  themeColor,
}: {
  viewId: string;
  themeColor: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">视图未找到</h3>
      <p className="text-sm text-gray-500 text-center max-w-md">
        视图 <span className="font-mono bg-gray-100 px-1 rounded">{viewId}</span> 尚未注册。 请使用
        registerView 或 registerLazyView 注册该视图组件。
      </p>
    </div>
  );
});

const LoadingFallback = memo(function LoadingFallback({ themeColor }: { themeColor: string }) {
  return <LoadingState themeColor={themeColor} message="加载视图组件..." />;
});

function ErrorFallback({
  error,
  onReset,
  themeColor,
}: {
  error: Error | null;
  onReset: () => void;
  themeColor: string;
}) {
  return (
    <div className="min-h-[200px] flex items-center justify-center p-4">
      <div className="bg-red-50 rounded-lg p-6 max-w-md w-full text-center">
        <div className="flex items-center justify-center w-12 h-12 bg-red-100 mx-auto mb-4">
          <svg
            className="w-6 h-6 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">组件加载失败</h3>
        <p className="text-sm text-gray-500 mb-4">{error?.message || '未知错误'}</p>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  );
}

export const OracleContentView = memo(function OracleContentView({
  config,
  activeTab,
  price,
  historicalData,
  networkStats,
  isLoading,
  publishers,
  validators,
  customData,
  themeColor,
  fallback,
  onError,
}: OracleContentViewProps) {
  const effectiveThemeColor = themeColor || config.themeColor || 'blue';

  const viewConfig = useMemo(() => {
    if (config.views) {
      return config.views.find((v) => v.id === activeTab);
    }
    return undefined;
  }, [config.views, activeTab]);

  const ViewComponent = useMemo(() => {
    return getViewComponent(activeTab, viewConfig);
  }, [activeTab, viewConfig]);

  const viewProps: ViewComponentProps = useMemo(
    () => ({
      config,
      price,
      historicalData,
      networkStats,
      publishers,
      validators,
      customData,
    }),
    [config, price, historicalData, networkStats, publishers, validators, customData]
  );

  if (isLoading) {
    return <LoadingState themeColor={effectiveThemeColor} />;
  }

  if (!ViewComponent) {
    return <DefaultViewFallback viewId={activeTab} themeColor={effectiveThemeColor} />;
  }

  const isLazyComponent =
    activeTab in lazyViewRegistry ||
    (viewConfig?.component && viewConfig.component in lazyViewRegistry);

  if (isLazyComponent) {
    return (
      <OracleErrorBoundary
        fallback={
          fallback || (
            <ErrorFallback error={null} onReset={() => {}} themeColor={effectiveThemeColor} />
          )
        }
        onError={onError}
        themeColor={effectiveThemeColor}
      >
        <Suspense fallback={<LoadingFallback themeColor={effectiveThemeColor} />}>
          <ViewComponent {...viewProps} />
        </Suspense>
      </OracleErrorBoundary>
    );
  }

  return (
    <OracleErrorBoundary fallback={fallback} onError={onError} themeColor={effectiveThemeColor}>
      <ViewComponent {...viewProps} />
    </OracleErrorBoundary>
  );
});

export function createViewRegistryInitializer(views: Record<string, ViewComponent>): () => void {
  return () => {
    Object.entries(views).forEach(([viewId, component]) => {
      registerView(viewId, component);
    });
  };
}

export function createLazyViewRegistryInitializer(
  views: Record<string, () => Promise<{ default: ViewComponent }>>
): () => void {
  return () => {
    Object.entries(views).forEach(([viewId, loader]) => {
      registerLazyView(viewId, loader);
    });
  };
}

export { viewRegistry, lazyViewRegistry };
