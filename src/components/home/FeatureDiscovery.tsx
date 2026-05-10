'use client';

import { useState, useCallback, useEffect } from 'react';

import Link from 'next/link';

import { ArrowRight, X, Search, GitCompare, Shield, Bell, Sparkles } from 'lucide-react';

const STEPS = [
  {
    step: 1,
    title: 'Query Prices',
    description: 'Look up real-time oracle prices across 10+ protocols',
    href: '/price-query',
    icon: Search,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    step: 2,
    title: 'Compare Oracles',
    description: 'Spot deviations and anomalies across oracle providers',
    href: '/cross-oracle',
    icon: GitCompare,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
  },
  {
    step: 3,
    title: 'Assess Risk',
    description: 'Evaluate oracle reliability with reputation scores',
    href: '/reputation',
    icon: Shield,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  {
    step: 4,
    title: 'Set Alerts',
    description: 'Get notified when prices deviate from thresholds',
    href: '/alerts',
    icon: Bell,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
  },
];

const STORAGE_KEY = 'insight_feature_guide_dismissed';

function getIsDismissed() {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export default function FeatureDiscovery() {
  const [isDismissed, setIsDismissed] = useState(getIsDismissed);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isDismissed) {
      const timer = setTimeout(() => setIsVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isDismissed]);

  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 200);
  }, []);

  if (isDismissed) return null;

  return (
    <div
      className="bg-gradient-to-r from-primary-50 via-blue-50 to-indigo-50 rounded-xl border border-primary-100 p-5 relative overflow-hidden"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'all 0.4s ease-out',
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-400 via-primary-400 to-indigo-400" />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 hover:bg-white/60 rounded-md transition-colors"
        aria-label="Dismiss guide"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <h2 className="text-base font-semibold text-gray-900">Getting Started</h2>
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          Follow these steps to get the most out of Insight
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.step}
              href={step.href}
              className={`flex items-start gap-3 p-3 rounded-lg ${step.bg} ${step.border} border hover:shadow-sm transition-all group`}
              style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(8px)',
                transition: `all 0.3s ease-out ${index * 80}ms`,
              }}
            >
              <div className="flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-md bg-white flex items-center justify-center ${step.color}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Step {step.step}
                  </span>
                </div>
                <div className="text-sm font-medium text-gray-900 mt-0.5">{step.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{step.description}</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 mt-1 flex-shrink-0 transition-colors" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
