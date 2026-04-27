'use client';

import { memo } from 'react';

import Link from 'next/link';

import {
  Activity,
  Shield,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  TrendingUp,
  Eye,
  Trophy,
} from 'lucide-react';

import { chartColors } from '@/lib/config/colors';
import { ORACLE_PROVIDER_VALUES, type OracleProvider } from '@/types/oracle/enums';

const ORACLE_LIST = ORACLE_PROVIDER_VALUES.slice(0, 10);

const FEATURE_CARDS = [
  {
    title: 'Cross-Oracle Comparison',
    description:
      'Compare prices across 10+ oracle protocols with deviation analysis and anomaly detection',
    href: '/cross-oracle',
    icon: BarChart3,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Risk Analysis',
    description:
      'HHI concentration, diversification scoring, volatility index, and correlation risk assessment',
    href: '/cross-oracle',
    icon: Shield,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
  },
  {
    title: 'Cross-Chain Analysis',
    description: 'Analyze oracle performance across 54 blockchains with price spread heatmaps',
    href: '/cross-chain',
    icon: TrendingUp,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Oracle Ranking',
    description:
      'Reliability scoring based on accuracy, latency, decentralization, and price deviation',
    href: '/cross-oracle',
    icon: Trophy,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
];

function OracleHealthMatrix() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700">Oracle Network</span>
        </div>
        <Link
          href="/cross-oracle"
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View Details
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {ORACLE_LIST.map((oracle) => {
          const color = chartColors.oracle[oracle as OracleProvider] || '#888888';
          return (
            <Link
              key={oracle}
              href={`/price-query?provider=${oracle}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-300 hover:shadow-sm transition-all group"
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900 truncate capitalize">
                {oracle}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function FeatureCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {FEATURE_CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all group"
          >
            <div
              className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center mb-3`}
            >
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
              {card.title}
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">{card.description}</p>
          </Link>
        );
      })}
    </div>
  );
}

function PlatformStats() {
  const stats = [
    { label: 'Oracle Protocols', value: '10+', icon: Eye, color: 'text-blue-500' },
    { label: 'Blockchains', value: '54', icon: Activity, color: 'text-emerald-500' },
    { label: 'Risk Indicators', value: '5', icon: Shield, color: 'text-purple-500' },
    {
      label: 'Anomaly Detection',
      value: 'IQR + Z-Score',
      icon: AlertTriangle,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900">{stat.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function DashboardContent() {
  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 rounded-full mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-sm font-medium text-emerald-700">Live Data</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
          Oracle Transparency & Risk Infrastructure
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl">
          See through every oracle. Real-time price monitoring, cross-oracle comparison, risk
          analysis, and anomaly detection across 10+ oracle protocols and 54 blockchains.
        </p>
      </div>

      <div className="space-y-6">
        <PlatformStats />

        <OracleHealthMatrix />

        <FeatureCards />
      </div>
    </div>
  );
}

export const HomeDashboard = memo(DashboardContent);
HomeDashboard.displayName = 'HomeDashboard';
