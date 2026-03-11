'use client';


import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { useOraclePrices } from '@/hooks/useOraclePrices';

// Oracle configuration with colors and icons
const oracleConfig = {
  LINK: {
    name: 'Chainlink',
    color: '#3B82F6',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  BAND: {
    name: 'Band Protocol',
    color: '#10B981',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="12" cy="12" r="4" fill="currentColor"/>
      </svg>
    ),
  },
  UMA: {
    name: 'UMA',
    color: '#F59E0B',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L4 6v12l8 4 8-4V6l-8-4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  PYTH: {
    name: 'Pyth Network',
    color: '#8B5CF6',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none"/>
        <circle cx="12" cy="12" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  API3: {
    name: 'API3',
    color: '#EC4899',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        <path d="M8 8h2v2H8V8zm4 0h2v2h-2V8zm4 0h2v2h-2V8z" fill="currentColor"/>
      </svg>
    ),
  },
};

// Feature navigation items
const featureNavItems = [
  {
    href: '/cross-oracle',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
    ),
    translationKey: 'crossOracle',
  },
  {
    href: '/cross-chain',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
      </svg>
    ),
    translationKey: 'crossChain',
  },
  {
    href: '/price-query',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
    ),
    translationKey: 'priceQuery',
  },
  {
    href: '/chainlink',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
    translationKey: 'chainlinkDetails',
  },
];

// Platform stats
const platformStats = [
  { key: 'oracles', value: '5', suffix: '+', labelKey: 'oracles' },
  { key: 'chains', value: '6', suffix: '+', labelKey: 'chains' },
  { key: 'feeds', value: '1000', suffix: '+', labelKey: 'feeds' },
  { key: 'updates', value: '1M', suffix: '+', labelKey: 'updates' },
];

// Oracle protocols for grid display
const oracleProtocols = [
  { key: 'chainlink', href: '/chainlink', color: '#3B82F6' },
  { key: 'band', href: '/band-protocol', color: '#10B981' },
  { key: 'uma', href: '/uma', color: '#F59E0B' },
  { key: 'pyth', href: '/pyth-network', color: '#8B5CF6' },
  { key: 'api3', href: '/api3', color: '#EC4899' },
];

// Minimal sparkline component
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg className="w-20 h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

// Hero Section - Flat Design
function HeroSection({ t }: { t: (key: string) => string }) {
  const stats = [
    { value: '5+', label: t('home.hero.stats.oracles') },
    { value: '6+', label: t('home.hero.stats.chains') },
    { value: '1000+', label: t('home.hero.stats.feeds') },
  ];

  return (
    <section className="relative bg-gray-900 overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}/>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"/>
            <span className="text-sm text-white/80">{t('home.hero.badge')}</span>
          </div>
          
          {/* Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-white mb-4 tracking-tight">
            {t('home.hero.title')}
            <span className="block text-white/90">{t('home.hero.titleHighlight')}</span>
          </h1>
          
          {/* Description */}
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8">
            {t('home.hero.description')}
          </p>
          
          {/* CTA Buttons - Flat style */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/cross-oracle" className="px-6 py-3 bg-white text-gray-900 font-medium hover:bg-white/90 transition-colors">
              {t('home.hero.ctaPrimary')}
            </Link>
            <Link href="/price-query" className="px-6 py-3 text-white/80 font-medium hover:text-white transition-colors border border-white/20 hover:border-white/40">
              {t('home.hero.ctaSecondary')}
            </Link>
          </div>
          
          {/* Stats - Static numbers */}
          <div className="flex items-center justify-center gap-8 sm:gap-12">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-semibold text-white">{stat.value}</div>
                <div className="text-sm text-white/50">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Live Prices Section - Flat table style
function LivePricesSection({ t, prices, loading }: { t: (key: string) => string; prices: Record<string, any>; loading: boolean }) {
  const priceEntries = Object.entries(oracleConfig);
  
  const generateTrend = (basePrice: number) => {
    return Array.from({ length: 20 }, () => {
      const variation = (Math.random() - 0.5) * basePrice * 0.1;
      return basePrice + variation;
    });
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">{t('home.livePrices.title')}</h2>
          <p className="text-gray-500 mt-1">{t('home.livePrices.subtitle')}</p>
        </div>
        
        {/* Price Table - Flat design */}
        <div className="border-t border-gray-200">
          {priceEntries.map(([symbol, config]) => {
            const priceData = prices[symbol];
            const price = priceData?.price || 0;
            const change24h = (Math.random() - 0.5) * 20;
            const isPositive = change24h >= 0;
            const trend = generateTrend(price);
            
            return (
              <div 
                key={symbol} 
                className="flex items-center justify-between py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-700" style={{ color: config.color }}>
                    {config.icon}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{config.name}</div>
                    <div className="text-sm text-gray-400">{symbol}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  {!loading && price > 0 ? (
                    <>
                      <div className="hidden sm:block">
                        <MiniSparkline data={trend} color={isPositive ? '#10B981' : '#EF4444'} />
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">${price.toFixed(2)}</div>
                        <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-16 h-4 bg-gray-100 animate-pulse"/>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Features Section - Minimal navigation
function FeaturesSection({ t }: { t: (key: string) => string }) {
  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900">{t('home.features.title')}</h2>
          <p className="text-gray-500 mt-1">{t('home.features.subtitle')}</p>
        </div>
        
        {/* Feature Navigation - Minimal style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-gray-200">
          {featureNavItems.map((feature) => (
            <Link 
              key={feature.href} 
              href={feature.href}
              className="group bg-gray-50 p-6 hover:bg-white transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="text-gray-400 group-hover:text-gray-600 transition-colors">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 group-hover:text-gray-700 transition-colors">
                    {t(`home.features.${feature.translationKey}.title`)}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {t(`home.features.${feature.translationKey}.description`)}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm text-gray-400 group-hover:text-gray-600 mt-3 transition-colors">
                    {t('home.exploreFeatures')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Oracle Protocols Section - Grid layout
function OracleProtocolsSection({ t }: { t: (key: string) => string }) {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900">{t('home.oracles.title')}</h2>
          <p className="text-gray-500 mt-1">{t('home.oracles.subtitle')}</p>
        </div>
        
        {/* Oracle Grid - Flat design */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {oracleProtocols.map((oracle) => (
            <Link 
              key={oracle.key} 
              href={oracle.href}
              className="group flex items-center gap-3 p-4 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <div 
                className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: oracle.color }}
              >
                {oracle.key.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {t(`home.oracles.${oracle.key}.name`)}
                </div>
              </div>
              <svg 
                className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// Platform Stats Section - Dashboard style
function PlatformStatsSection({ t }: { t: (key: string) => string }) {
  return (
    <section className="py-16 sm:py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900">{t('home.stats.title')}</h2>
          <p className="text-gray-500 mt-1">{t('home.stats.subtitle')}</p>
        </div>
        
        {/* Stats Grid - Large numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {platformStats.map((stat) => (
            <div key={stat.key} className="text-center">
              <div className="text-4xl sm:text-5xl font-semibold text-gray-900">
                {stat.value}{stat.suffix}
              </div>
              <div className="text-sm text-gray-500 mt-2 uppercase tracking-wide">
                {t(`home.stats.${stat.labelKey}`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Data Insights Section - Minimal cards
function DataInsightsSection({ t }: { t: (key: string) => string }) {
  const insights = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
      ),
      title: t('home.insights.priceAlert'),
      value: '3',
      subtitle: t('home.insights.anomaliesDetected') || '个异常',
      trend: '+1',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      ),
      title: t('home.insights.dataQuality'),
      value: '98.5%',
      subtitle: t('home.insights.vsYesterday') || '较昨日',
      trend: '+0.3%',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        </svg>
      ),
      title: t('home.insights.marketTrend'),
      value: '+5.2%',
      subtitle: t('home.insights.vsLastWeek') || '较上周',
      trend: '+2.1%',
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-gray-900">{t('home.insights.title')}</h2>
          <p className="text-gray-500 mt-1">{t('home.insights.subtitle')}</p>
        </div>
        
        {/* Insights Grid - Minimal cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {insights.map((insight) => (
            <div key={insight.title} className="p-6 border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex items-center gap-2 text-gray-400 mb-4">
                {insight.icon}
                <span className="text-sm">{insight.title}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-gray-900">{insight.value}</span>
                <span className="text-sm text-green-600">{insight.trend}</span>
              </div>
              <div className="text-sm text-gray-400 mt-1">{insight.subtitle}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// About Section - Simple text
function AboutSection({ t }: { t: (key: string) => string }) {
  return (
    <section className="py-16 sm:py-20 bg-gray-50 border-t border-gray-200">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('home.aboutTitle')}</h2>
        <p className="text-gray-600 leading-relaxed">{t('home.aboutDescription')}</p>
        <p className="text-sm text-gray-400 mt-6">{t('home.builtWith')}</p>
      </div>
    </section>
  );
}

// Main Page Component
export default function Home() {
  const { t } = useI18n();
  const { prices, loading } = useOraclePrices();

  return (
    <main className="min-h-screen">
      <HeroSection t={t} />
      <LivePricesSection t={t} prices={prices} loading={loading} />
      <FeaturesSection t={t} />
      <OracleProtocolsSection t={t} />
      <PlatformStatsSection t={t} />
      <DataInsightsSection t={t} />
      <AboutSection t={t} />
    </main>
  );
}
