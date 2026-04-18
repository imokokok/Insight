'use client';

import Link from 'next/link';

import { Rocket, Search, TrendingUp, Bell, ArrowRight, CheckCircle } from 'lucide-react';

export default function QuickStartSection() {
  const steps = [
    {
      icon: <Search className="w-6 h-6" />,
      title: 'Search Prices',
      description: 'Enter a token symbol to get real-time prices from multiple oracles',
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Analyze Data',
      description: 'Compare prices across oracles and blockchains with detailed charts',
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: 'Set Alerts',
      description: 'Create price alerts to get notified when conditions are met',
    },
  ];

  return (
    <section id="quickstart" className="py-16 scroll-mt-20">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Rocket className="w-5 h-5 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Quick Start Guide</h2>
        </div>
        <p className="text-gray-600 leading-relaxed">
          Get started with Insight in just a few steps
        </p>
      </div>

      {/* Platform Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Overview</h3>
        <p className="text-gray-600 mb-4">
          Insight aggregates price data from multiple oracles and blockchains to provide
          comprehensive market insights.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Real-time price data</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Multi-oracle comparison</span>
          </div>
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">Cross-chain analysis</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Getting Started</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 text-blue-600">
                {step.icon}
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {index + 1}
                </span>
                <h4 className="font-semibold text-gray-900">{step.title}</h4>
              </div>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/price-query"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Start Searching
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/cross-oracle"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Compare Oracles
        </Link>
      </div>
    </section>
  );
}
