'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  Search,
  GitCompare,
  Globe,
  History,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface FeatureCard {
  id: string;
  title: string;
  titleZh: string;
  description: string;
  descriptionZh: string;
  icon: React.ElementType;
  href: string;
  color: string;
}

const features: FeatureCard[] = [
  {
    id: 'price-query',
    title: 'Price Query',
    titleZh: '价格查询',
    description: 'Real-time price data from multiple oracles',
    descriptionZh: '多预言机实时价格数据查询',
    icon: Search,
    href: '/price-query',
    color: 'blue',
  },
  {
    id: 'cross-oracle',
    title: 'Cross-Oracle Compare',
    titleZh: '跨预言机比较',
    description: 'Compare prices across different oracle providers',
    descriptionZh: '比较不同预言机提供商的价格',
    icon: GitCompare,
    href: '/cross-oracle',
    color: 'indigo',
  },
  {
    id: 'cross-chain',
    title: 'Cross-Chain Compare',
    titleZh: '跨链比较',
    description: 'Analyze price differences across chains',
    descriptionZh: '分析不同链上的价格差异',
    icon: Globe,
    href: '/cross-chain',
    color: 'violet',
  },
  {
    id: 'history',
    title: 'Historical Analysis',
    titleZh: '历史分析',
    description: 'View historical price trends and charts',
    descriptionZh: '查看历史价格趋势和图表',
    icon: History,
    href: '/history',
    color: 'emerald',
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', gradient: 'from-violet-500 to-violet-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
};

export default function FeatureCards() {
  const { locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {isZh ? '功能入口' : 'Features'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {isZh
              ? '探索平台核心功能，获取全面的预言机数据分析'
              : 'Explore core platform features for comprehensive oracle data analysis'}
          </p>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const colors = colorMap[feature.color];
            const isHovered = hoveredCard === feature.id;

            return (
              <Link
                key={feature.id}
                href={feature.href}
                className={`
                  relative group rounded-2xl border bg-white p-6
                  transition-all duration-300 ease-out
                  ${colors.border}
                  ${isHovered ? 'shadow-xl -translate-y-1' : 'shadow-sm'}
                `}
                onMouseEnter={() => setHoveredCard(feature.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Background gradient on hover */}
                <div
                  className={`
                    absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0
                    group-hover:opacity-5 rounded-2xl transition-opacity duration-300
                  `}
                />

                <div className="relative flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`
                      flex-shrink-0 p-3 rounded-xl ${colors.bg}
                      group-hover:shadow-md transition-shadow duration-300
                    `}
                  >
                    <Icon className={`w-6 h-6 ${colors.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {isZh ? feature.titleZh : feature.title}
                    </h3>
                    <p className="text-sm text-gray-500 truncate">
                      {isZh ? feature.descriptionZh : feature.description}
                    </p>
                  </div>

                  {/* Arrow Indicator */}
                  <div
                    className={`
                      flex-shrink-0 p-2 rounded-full ${colors.bg}
                      transition-all duration-300
                      ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
                    `}
                  >
                    <ArrowRight className={`w-4 h-4 ${colors.text}`} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
