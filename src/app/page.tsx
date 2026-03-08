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

export default function Home() {
  const { t } = useI18n();
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);

  const platformStats = [
    { label: t('home.platformStats.oraclesIntegrated'), value: '5', change: t('home.platformStats.active') },
    { label: t('home.platformStats.blockchains'), value: '6', change: t('home.platformStats.supported') },
    { label: t('home.platformStats.dataFeeds'), value: '1000+', change: t('home.platformStats.growing') },
    { label: t('home.platformStats.comparisons'), value: 'Cross-Chain', change: t('home.platformStats.available') },
  ];

  const quickStats = [
    { provider: 'Chainlink', symbol: 'LINK', price: 14.85, change: '+2.3%' },
    { provider: 'Band Protocol', symbol: 'BAND', price: 1.72, change: '-0.8%' },
    { provider: 'Pyth Network', symbol: 'PYTH', price: 0.98, change: '+1.5%' },
    { provider: 'UMA', symbol: 'UMA', price: 4.56, change: '+0.2%' },
  ];

  const navigationCards = [
    {
      href: '/cross-oracle',
      title: t('navbar.crossOracle'),
      description: 'Compare performance, security, and features across different oracle solutions',
      icon: '🔍',
    },
    {
      href: '/cross-chain',
      title: t('navbar.crossChain'),
      description: 'Analyze oracle performance across multiple blockchain networks',
      icon: '⛓️',
    },
    {
      href: '/chainlink',
      title: 'Chainlink',
      description: 'Decentralized oracle network with robust infrastructure',
      icon: '🔗',
    },
    {
      href: '/band-protocol',
      title: 'Band Protocol',
      description: 'Cross-chain data oracle platform',
      icon: '📡',
    },
    {
      href: '/uma',
      title: 'UMA',
      description: 'Optimistic oracle protocol for decentralized finance',
      icon: '⭐',
    },
    {
      href: '/pyth-network',
      title: 'Pyth Network',
      description: 'High-frequency financial data oracle',
      icon: '📊',
    },
    {
      href: '/api3',
      title: 'API3',
      description: 'Decentralized API solutions connecting real-world data',
      icon: '🔌',
    },
  ];

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{t('home.title')}</h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            {t('home.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {platformStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="py-6">
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-blue-600 mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('home.quickStats')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickStats.map((stat, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="py-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">{stat.provider}</p>
                  <span className="text-lg font-semibold text-gray-500">{stat.symbol}</span>
                </div>
                {loading ? (
                  <div className="h-10 flex items-center justify-center text-gray-400 text-sm">
                    {t('home.loading')}
                  </div>
                ) : prices[stat.symbol] ? (
                  <>
                    <p className="text-2xl font-bold text-gray-900">
                      ${prices[stat.symbol].price.toFixed(2)}
                    </p>
                    <p
                      className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {stat.change}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-gray-900">${stat.price.toFixed(2)}</p>
                    <p
                      className={`text-sm mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {stat.change}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('home.exploreFeatures')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {navigationCards.map((card, index) => (
            <Link key={index} href={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="py-6">
                  <div className="text-4xl mb-3">{card.icon}</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-gray-600">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
        <CardContent className="py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {t('home.aboutTitle')}
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto mb-4">
              {t('home.aboutDescription')}
            </p>
            <p className="text-gray-500 text-sm">
              {t('home.builtWith')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
