'use client';

import { useState, useEffect } from 'react';

import {
  Zap,
  DollarSign,
  Clock,
  Shield,
  Database,
  Server,
  CheckCircle,
  AlertCircle,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileSignature,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type RedStonePullModelViewProps } from '../types';

import { GasCostCalculator } from './GasCostCalculator';
import { SignatureVerification } from './SignatureVerification';

export function RedStonePullModelView({ isLoading: _isLoading }: RedStonePullModelViewProps) {
  const t = useTranslations();

  const [activeStep, setActiveStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('principle');
  const [dataTimestamp, setDataTimestamp] = useState<Date>(new Date());
  const [recentUpdates] = useState<{ id: number; time: string }[]>(() => {
    const baseTime = Date.now();
    return [1, 2, 3, 4, 5].map((i) => ({
      id: i,
      time: new Date(baseTime - i * 10000).toLocaleTimeString(),
    }));
  });

  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 2000);

    return () => clearInterval(interval);
  }, [isAnimating]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDataTimestamp(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const principleSteps = [
    {
      id: 'push',
      title: t('redstone.pullModel.pushModel') || 'Push Model',
      desc: t('redstone.pullModel.pushModelDesc') || 'Oracle pushes data on-chain periodically',
      icon: Database,
      color: '#6b7280',
    },
    {
      id: 'pull',
      title: t('redstone.pullModel.pullModel') || 'Pull Model',
      desc: t('redstone.pullModel.pullModelDesc') || 'User pulls data on-demand with signature',
      icon: Zap,
      color: '#ef4444',
    },
  ];

  const workflowSteps = [
    {
      step: 1,
      title: t('redstone.pullModel.step1Title') || 'Data Request',
      desc: t('redstone.pullModel.step1Desc') || 'User requests price data from RedStone',
      icon: Server,
    },
    {
      step: 2,
      title: t('redstone.pullModel.step2Title') || 'Provider Sign',
      desc: t('redstone.pullModel.step2Desc') || 'Multiple providers sign the data package',
      icon: FileSignature,
    },
    {
      step: 3,
      title: t('redstone.pullModel.step3Title') || 'Data Injection',
      desc: t('redstone.pullModel.step3Desc') || 'Signed data embedded into transaction',
      icon: Database,
    },
    {
      step: 4,
      title: t('redstone.pullModel.step4Title') || 'On-chain Verify',
      desc: t('redstone.pullModel.step4Desc') || 'Smart contract verifies signatures',
      icon: Shield,
    },
  ];

  const advantages = [
    {
      icon: TrendingDown,
      title: t('redstone.pullModel.gasSavings') || '70%+ Gas Savings',
      desc: t('redstone.pullModel.gasSavingsDesc') || 'No unnecessary on-chain updates',
    },
    {
      icon: Clock,
      title: t('redstone.pullModel.realTimeData') || 'Real-time Data',
      desc: t('redstone.pullModel.realTimeDataDesc') || 'Always fresh data when you need it',
    },
    {
      icon: Shield,
      title: t('redstone.pullModel.security') || 'Enhanced Security',
      desc: t('redstone.pullModel.securityDesc') || 'Multi-signature verification',
    },
    {
      icon: Zap,
      title: t('redstone.pullModel.efficiency') || 'High Efficiency',
      desc: t('redstone.pullModel.efficiencyDesc') || 'Data injected directly into transactions',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {advantages.map((advantage, index) => (
          <div
            key={index}
            className="p-4 bg-white rounded-lg border border-gray-100 hover:border-red-200 transition-colors"
          >
            <advantage.icon className="w-5 h-5 text-red-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-900">{advantage.title}</h4>
            <p className="text-xs text-gray-500 mt-1">{advantage.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('principle')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.pullModel.workingPrinciple') || 'Working Principle'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.pullModel.workingPrincipleDesc') || 'Push vs Pull Model comparison'}
              </p>
            </div>
          </div>
          {expandedSection === 'principle' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'principle' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {principleSteps.map((principle, index) => (
                <div
                  key={principle.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    index === 1 ? 'border-red-500 bg-red-50/50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${principle.color}20` }}
                    >
                      <principle.icon className="w-5 h-5" style={{ color: principle.color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{principle.title}</h4>
                      <p className="text-xs text-gray-500">{principle.desc}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {index === 0 ? (
                      <>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Database className="w-3.5 h-3.5" />
                          <span>
                            {t('redstone.pullModel.periodicUpdates') || 'Periodic updates'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>{t('redstone.pullModel.highGasCost') || 'High gas cost'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {t('redstone.pullModel.staleData') || 'Potentially stale data'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Zap className="w-3.5 h-3.5 text-red-500" />
                          <span>{t('redstone.pullModel.onDemandFetch') || 'On-demand fetch'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                          <span>{t('redstone.pullModel.lowGasCost') || '70%+ lower gas cost'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <RefreshCw className="w-3.5 h-3.5 text-red-500" />
                          <span>{t('redstone.pullModel.alwaysFresh') || 'Always fresh data'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">
                {t('redstone.pullModel.workflow') || 'Pull Model Workflow'}
              </h4>
              <div className="flex items-center justify-between relative">
                <div className="absolute top-5 left-10 right-10 h-0.5 bg-gray-200" />
                {workflowSteps.map((step, index) => (
                  <div key={step.step} className="relative flex flex-col items-center z-10">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        activeStep >= index ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500 max-w-[80px]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  {isAnimating ? (
                    <>
                      <span>{t('redstone.pullModel.pauseAnimation') || 'Pause'}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('redstone.pullModel.playAnimation') || 'Play'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <GasCostCalculator />

      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('freshness')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.pullModel.dataFreshness') || 'Data Freshness Monitor'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.pullModel.dataFreshnessDesc') || 'Real-time data timestamp tracking'}
              </p>
            </div>
          </div>
          {expandedSection === 'freshness' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'freshness' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-xs text-gray-500">
                    {t('redstone.pullModel.lastUpdate') || 'Last Update'}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {dataTimestamp.toLocaleTimeString()}
                </p>
                <p className="text-xs text-gray-500">{dataTimestamp.toLocaleDateString()}</p>
              </div>

              <div className="p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-gray-500">
                    {t('redstone.pullModel.freshnessScore') || 'Freshness Score'}
                  </span>
                </div>
                <p className="text-lg font-semibold text-emerald-600">98.5/100</p>
                <p className="text-xs text-emerald-500">
                  {t('redstone.pullModel.excellent') || 'Excellent'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {t('redstone.pullModel.avgLatency') || 'Avg Latency'}
                  </span>
                </div>
                <p className="text-lg font-semibold text-gray-900">45ms</p>
                <p className="text-xs text-gray-500">
                  {t('redstone.pullModel.lastHour') || 'Last hour'}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('redstone.pullModel.recentUpdates') || 'Recent Data Updates'}
              </h4>
              <div className="space-y-2">
                {recentUpdates.map((update) => (
                  <div
                    key={update.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-gray-600">ETH/USD</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium text-gray-900">$3,245.67</span>
                      <span className="text-xs text-gray-500">{update.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <SignatureVerification />
    </div>
  );
}
