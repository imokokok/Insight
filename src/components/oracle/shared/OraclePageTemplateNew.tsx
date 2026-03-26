'use client';

import { useState, useCallback, useMemo, ComponentType, ReactNode } from 'react';
import { useTranslations } from '@/i18n';
import { OracleConfig, getOracleConfig } from '@/lib/config/oracles';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';
import { LoadingState, ErrorFallback } from '@/components/oracle';

export interface OraclePageData {
  price?: PriceData;
  historicalData?: PriceData[];
  networkStats?: NetworkStats;
  publishers?: PublisherData[];
  validators?: ValidatorData[];
  [key: string]: unknown;
}

export interface NetworkStats {
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
  status: string;
  contribution: number;
  accuracy: number;
  stake?: number;
}

export interface ValidatorData {
  id: string;
  name: string;
  stake: number;
  performance: number;
  status: string;
  uptime?: number;
  rewards?: number;
}

export interface OracleHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: NetworkStats | null;
  publishers?: PublisherData[];
  validators?: ValidatorData[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
}

export interface OracleSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{ id: string; labelKey: string }>;
  themeColor?: string;
}

export interface OracleViewProps {
  config: OracleConfig;
  data: OraclePageData;
  isLoading: boolean;
}

export interface OracleViewConfig {
  id: string;
  labelKey: string;
  component: ComponentType<OracleViewProps>;
  requiredData?: string[];
  default?: boolean;
}

export interface OraclePageTemplateProps {
  provider: OracleProvider;
  hero: {
    component: ComponentType<OracleHeroProps>;
  };
  sidebar: {
    component: ComponentType<OracleSidebarProps>;
  };
  views: OracleViewConfig[];
  data: OraclePageData;
  state: {
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    isRefreshing: boolean;
    lastUpdated: Date | null;
  };
  actions: {
    refresh: () => void;
    exportData: () => void;
  };
  customLoadingComponent?: ReactNode;
  customErrorComponent?: ReactNode;
}

export function OraclePageTemplate({
  provider,
  hero: HeroComponent,
  sidebar: SidebarComponent,
  views,
  data,
  state,
  actions,
  customLoadingComponent,
  customErrorComponent,
}: OraclePageTemplateProps) {
  const t = useTranslations();
  const config = useMemo(() => getOracleConfig(provider), [provider]);
  
  const [activeTab, setActiveTab] = useState(() => {
    const defaultView = views.find(v => v.default) || views[0];
    return defaultView?.id || views[0]?.id || '';
  });
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  }, []);

  const activeView = useMemo(() => {
    return views.find(view => view.id === activeTab);
  }, [views, activeTab]);

  if (state.isLoading && !data.price && !customLoadingComponent) {
    return <LoadingState themeColor={config.themeColor} />;
  }

  if (state.isLoading && customLoadingComponent) {
    return <>{customLoadingComponent}</>;
  }

  if (state.isError && state.error) {
    if (customErrorComponent) {
      return <>{customErrorComponent}</>;
    }
    return (
      <ErrorFallback
        error={state.error}
        onRetry={actions.refresh}
        themeColor={config.themeColor}
      />
    );
  }

  const Hero = HeroComponent.component;
  const Sidebar = SidebarComponent.component;

  return (
    <div className="min-h-screen bg-insight">
      <Hero
        config={config}
        price={data.price ?? null}
        historicalData={data.historicalData}
        networkStats={data.networkStats ?? null}
        publishers={data.publishers}
        validators={data.validators}
        isLoading={state.isLoading}
        isError={state.isError}
        isRefreshing={state.isRefreshing}
        lastUpdated={state.lastUpdated}
        onRefresh={actions.refresh}
        onExport={actions.exportData}
      />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <Sidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                tabs={views.map(v => ({ id: v.id, labelKey: v.labelKey }))}
                themeColor={config.themeColor}
              />
            </div>
          </div>

          <div className="lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-md text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {t('oracle.menu.title')}
            </button>
          </div>

          {isMobileMenuOpen && (
            <div 
              className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div 
                className="absolute left-0 top-0 h-full w-64 bg-white" 
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                    {t('oracle.navigation.title')}
                  </h2>
                  <button onClick={() => setIsMobileMenuOpen(false)}>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <Sidebar
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabs={views.map(v => ({ id: v.id, labelKey: v.labelKey }))}
                  themeColor={config.themeColor}
                />
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {activeView && (
              <activeView.component
                config={config}
                data={data}
                isLoading={state.isLoading}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
