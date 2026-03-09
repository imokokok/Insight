'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import Card, { CardContent } from '@/components/Card';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  PriceData,
  Blockchain,
} from '@/lib/oracles';

const platformStatsBase = [
  {
    key: 'oraclesIntegrated',
    value: '5',
    changeKey: 'active',
  },
  {
    key: 'blockchains',
    value: '6',
    changeKey: 'supported',
  },
  {
    key: 'dataFeeds',
    value: '1000+',
    changeKey: 'growing',
  },
  {
    key: 'comparisons',
    value: 'Cross-Chain',
    changeKey: 'available',
  },
];

const quickStats = [
  { provider: 'Chainlink', symbol: 'LINK' },
  { provider: 'Band Protocol', symbol: 'BAND' },
  { provider: 'Pyth Network', symbol: 'PYTH' },
  { provider: 'UMA', symbol: 'UMA' },
];

const navigationCardsBase = [
    {
      href: '/cross-oracle',
      titleKey: 'navbar.crossOracle',
      descriptionKey: 'home.navigationCards.crossOracle',
      icon: '🔍',
    },
    {
      href: '/cross-chain',
      titleKey: 'navbar.crossChain',
      descriptionKey: 'home.navigationCards.crossChain',
      icon: '⛓️',
    },
    {
      href: '/chainlink',
      titleKey: 'Chainlink',
      descriptionKey: 'home.navigationCards.chainlink',
      icon: '🔗',
    },
    {
      href: '/band-protocol',
      titleKey: 'Band Protocol',
      descriptionKey: 'home.navigationCards.bandProtocol',
      icon: '📡',
    },
    {
      href: '/uma',
      titleKey: 'UMA',
      descriptionKey: 'home.navigationCards.uma',
      icon: '⭐',
    },
    {
      href: '/pyth-network',
      titleKey: 'Pyth Network',
      descriptionKey: 'home.navigationCards.pythNetwork',
      icon: '📊',
    },
    {
      href: '/api3',
      titleKey: 'API3',
      descriptionKey: 'home.navigationCards.api3',
      icon: '🔌',
    },
  ];

export default function Home() {
  const { t } = useI18n();
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  const platformStats = platformStatsBase.map(stat => ({
    label: t(`home.platformStats.${stat.key}`),
    value: stat.value,
    change: t(`home.platformStats.${stat.changeKey}`),
  }));

  const navigationCards = navigationCardsBase.map(card => ({
    href: card.href,
    title: card.titleKey,
    titleKey: card.titleKey,
    description: t(card.descriptionKey),
    icon: card.icon,
  }));

  useEffect(() => {
    async function fetchPrices() {
      try {
        const chainlinkClient = new ChainlinkClient();
        const bandClient = new BandProtocolClient();
        const umaClient = new UMAClient();
        const pythClient = new PythNetworkClient();

        const [linkPrice, bandPrice, umaPrice, pythPrice] = await Promise.allSettled([
          chainlinkClient.getPrice('LINK', Blockchain.ETHEREUM),
          bandClient.getPrice('BAND', Blockchain.ETHEREUM),
          umaClient.getPrice('UMA', Blockchain.ETHEREUM),
          pythClient.getPrice('PYTH', Blockchain.SOLANA),
        ]);

        const priceMap: Record<string, PriceData> = {};
        if (linkPrice.status === 'fulfilled') priceMap['LINK'] = linkPrice.value;
        if (bandPrice.status === 'fulfilled') priceMap['BAND'] = bandPrice.value;
        if (umaPrice.status === 'fulfilled') priceMap['UMA'] = umaPrice.value;
        if (pythPrice.status === 'fulfilled') priceMap['PYTH'] = pythPrice.value;

        setPrices(priceMap);
      } catch (error) {
        console.error('Error fetching prices:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchPrices();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-10 sm:mb-12">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('home.title')}
          </h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
            {t('home.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
        {platformStats.map((stat, index) => (
          <Card
            key={index}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="py-4 sm:py-6">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs sm:text-sm text-blue-600 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-10">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          {t('home.quickStats')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {quickStats.map((stat, index) => (
            <Card
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${400 + index * 100}ms` }}
            >
              <CardContent className="py-4 sm:py-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.provider}</p>
                  <span className="text-base sm:text-lg font-semibold text-gray-500">
                    {stat.symbol}
                  </span>
                </div>
                {loading ? (
                  <div className="h-10 flex items-center justify-center text-gray-400 text-sm animate-pulse-finance">
                    {t('home.loading')}
                  </div>
                ) : prices[stat.symbol] ? (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      ${prices[stat.symbol].price.toFixed(2)}
                    </p>
                    <p className="text-xs sm:text-sm mt-1 text-green-600">
                      {((prices[stat.symbol].confidence ?? 0.95) * 100).toFixed(0)}% confidence
                    </p>
                  </>
                ) : (
                  <div className="h-10 flex items-center justify-center text-gray-400 text-sm">
                    {t('home.unavailable')}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
          {t('home.exploreFeatures')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {navigationCards.map((card, index) => (
            <Link key={index} href={card.href}>
              <Card
                className="h-full animate-fade-in"
                style={{ animationDelay: `${800 + index * 100}ms` }}
              >
                <CardContent className="py-4 sm:py-6">
                  <div className="text-3xl sm:text-4xl mb-3">{card.icon}</div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                    {card.title === card.titleKey ? t(card.titleKey) : card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100 animate-fade-in"
        style={{ animationDelay: '1200ms' }}
      >
        <CardContent className="py-6 sm:py-8">
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              {t('home.aboutTitle')}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-3xl mx-auto mb-4">
              {t('home.aboutDescription')}
            </p>
            <p className="text-gray-500 text-xs sm:text-sm">{t('home.builtWith')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
