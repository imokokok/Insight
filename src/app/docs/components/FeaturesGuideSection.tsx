'use client';

import Link from 'next/link';

import {
  Layers,
  Search,
  GitCompare,
  Link2,
  Bell,
  ArrowRight,
  BarChart3,
  Clock,
  Shield,
} from 'lucide-react';

export default function FeaturesGuideSection() {
  const features = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Price Query',
      description: 'Query real-time prices from multiple oracles with detailed analytics',
      href: '/price-query',
      highlights: [
        'Multi-oracle price comparison',
        'Historical price charts',
        'Confidence intervals',
      ],
    },
    {
      icon: <GitCompare className="w-6 h-6" />,
      title: 'Cross-Oracle Comparison',
      description: 'Compare prices across different oracle providers',
      href: '/cross-oracle',
      highlights: [
        'Price deviation analysis',
        'Oracle reliability metrics',
        'Real-time monitoring',
      ],
    },
    {
      icon: <Link2 className="w-6 h-6" />,
      title: 'Cross-Chain Analysis',
      description: 'Analyze price differences across blockchains',
      href: '/cross-chain',
      highlights: [
        'Multi-chain price tracking',
        'Arbitrage opportunities',
        'Chain-specific metrics',
      ],
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: 'Price Alerts',
      description: 'Set up custom alerts for price conditions',
      href: '/alerts',
      highlights: ['Threshold-based alerts', 'Email notifications', 'Custom conditions'],
    },
  ];

  return (
    <section id="features" className="py-16 scroll-mt-20 border-t border-gray-200">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Features Guide</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Explore all the features Insight has to offer
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 flex-shrink-0">
                {feature.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>

            {/* Highlights */}
            <div className="space-y-2 mb-4">
              {feature.highlights.map((highlight, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <BarChart3 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>

            <Link
              href={feature.href}
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
            >
              Learn More
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Additional Info */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Real-time Updates</p>
            <p className="text-xs text-gray-600">Prices updated every second</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
          <Shield className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Accurate Data</p>
            <p className="text-xs text-gray-600">Trusted oracle sources</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          <div>
            <p className="text-sm font-medium text-gray-900">Comprehensive</p>
            <p className="text-xs text-gray-600">All major oracles covered</p>
          </div>
        </div>
      </div>
    </section>
  );
}
