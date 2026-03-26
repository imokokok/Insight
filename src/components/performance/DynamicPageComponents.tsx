'use client';

import dynamic from 'next/dynamic';
import { ComponentType, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

// ============================================================================
// Loading Components for Pages
// ============================================================================

interface PageLoadingProps {
  message?: string;
  height?: string;
}

function PageLoading({ message = 'Loading...', height = '100vh' }: PageLoadingProps) {
  return (
    <div
      className="flex flex-col items-center justify-center bg-insight"
      style={{ height, minHeight: '400px' }}
    >
      <Spinner size="lg" variant="primary" />
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  );
}

function PageSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-insight">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </CardContent>
        </Card>
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// Dynamic Page Components
// ============================================================================

/**
 * Dynamic Cross Oracle Page
 * Heavy comparison page with multiple charts and data tables
 */
export const DynamicCrossOraclePage = dynamic(
  () => import('@/app/[locale]/cross-oracle/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Cross-Oracle Comparison..." />,
  }
);

/**
 * Dynamic Cross Chain Page
 * Multi-chain analysis with complex visualizations
 */
export const DynamicCrossChainPage = dynamic(
  () => import('@/app/[locale]/cross-chain/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Cross-Chain Analysis..." />,
  }
);

/**
 * Dynamic Market Overview Page
 * Dashboard with multiple widgets and charts
 */
export const DynamicMarketOverviewPage = dynamic(
  () => import('@/app/[locale]/market-overview/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Market Overview..." />,
  }
);

/**
 * Dynamic Price Query Page
 * Interactive price query interface
 */
export const DynamicPriceQueryPage = dynamic(
  () => import('@/app/[locale]/price-query/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Price Query..." height="600px" />,
  }
);

/**
 * Dynamic Alerts Page
 * Alert management interface
 */
export const DynamicAlertsPage = dynamic(
  () => import('@/app/[locale]/alerts/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Alerts..." height="600px" />,
  }
);

/**
 * Dynamic Favorites Page
 * User favorites dashboard
 */
export const DynamicFavoritesPage = dynamic(
  () => import('@/app/[locale]/favorites/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Favorites..." height="600px" />,
  }
);

/**
 * Dynamic Settings Page
 * User settings interface
 */
export const DynamicSettingsPage = dynamic(
  () => import('@/app/[locale]/settings/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Settings..." height="600px" />,
  }
);

// ============================================================================
// Oracle Provider Pages
// ============================================================================

/**
 * Dynamic Chainlink Page
 */
export const DynamicChainlinkPage = dynamic(
  () => import('@/app/[locale]/chainlink/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Chainlink Data..." />,
  }
);

/**
 * Dynamic Pyth Page
 */
export const DynamicPythPage = dynamic(
  () => import('@/app/[locale]/pyth/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Pyth Network Data..." />,
  }
);

/**
 * Dynamic API3 Page
 */
export const DynamicAPI3Page = dynamic(
  () => import('@/app/[locale]/api3/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading API3 Data..." />,
  }
);

/**
 * Dynamic Band Protocol Page
 */
export const DynamicBandProtocolPage = dynamic(
  () => import('@/app/[locale]/band-protocol/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Band Protocol Data..." />,
  }
);

/**
 * Dynamic DIA Page
 */
export const DynamicDIAPage = dynamic(
  () => import('@/app/[locale]/dia/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading DIA Data..." />,
  }
);

/**
 * Dynamic UMA Page
 */
export const DynamicUMAPage = dynamic(
  () => import('@/app/[locale]/uma/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading UMA Data..." />,
  }
);

/**
 * Dynamic Tellor Page
 */
export const DynamicTellorPage = dynamic(
  () => import('@/app/[locale]/tellor/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Tellor Data..." />,
  }
);

/**
 * Dynamic RedStone Page
 */
export const DynamicRedStonePage = dynamic(
  () => import('@/app/[locale]/redstone/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading RedStone Data..." />,
  }
);

/**
 * Dynamic Chronicle Page
 */
export const DynamicChroniclePage = dynamic(
  () => import('@/app/[locale]/chronicle/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading Chronicle Data..." />,
  }
);

/**
 * Dynamic WINkLink Page
 */
export const DynamicWINkLinkPage = dynamic(
  () => import('@/app/[locale]/winklink/page'),
  {
    ssr: false,
    loading: () => <PageLoading message="Loading WINkLink Data..." />,
  }
);

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Preload a page component for faster navigation
 * @param pageName - Name of the page component to preload
 */
export function preloadPage(pageName: string): void {
  const preloadMap: Record<string, () => Promise<unknown>> = {
    CrossOracle: () => import('@/app/[locale]/cross-oracle/page'),
    CrossChain: () => import('@/app/[locale]/cross-chain/page'),
    MarketOverview: () => import('@/app/[locale]/market-overview/page'),
    PriceQuery: () => import('@/app/[locale]/price-query/page'),
    Alerts: () => import('@/app/[locale]/alerts/page'),
    Favorites: () => import('@/app/[locale]/favorites/page'),
    Settings: () => import('@/app/[locale]/settings/page'),
    Chainlink: () => import('@/app/[locale]/chainlink/page'),
    Pyth: () => import('@/app/[locale]/pyth/page'),
    API3: () => import('@/app/[locale]/api3/page'),
    BandProtocol: () => import('@/app/[locale]/band-protocol/page'),
    DIA: () => import('@/app/[locale]/dia/page'),
    UMA: () => import('@/app/[locale]/uma/page'),
    Tellor: () => import('@/app/[locale]/tellor/page'),
    RedStone: () => import('@/app/[locale]/redstone/page'),
    Chronicle: () => import('@/app/[locale]/chronicle/page'),
    WINkLink: () => import('@/app/[locale]/winklink/page'),
  };

  const preloadFn = preloadMap[pageName];
  if (preloadFn) {
    preloadFn();
  }
}

/**
 * Preload multiple page components
 * @param pageNames - Array of page component names to preload
 */
export function preloadPages(pageNames: string[]): void {
  pageNames.forEach(preloadPage);
}

/**
 * Create a dynamic page component with custom loading
 */
export function createDynamicPage<T extends Record<string, unknown>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingMessage?: string
): ComponentType<T> {
  return dynamic(importFn, {
    ssr: false,
    loading: () => <PageLoading message={loadingMessage} />,
  }) as ComponentType<T>;
}

// ============================================================================
// Export Types
// ============================================================================

export type DynamicPageComponent = ComponentType<unknown>;
