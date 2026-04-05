'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, Layers, Globe, Shield, Clock, Users, Building2, Loader2 } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type UmaEcosystemViewProps } from '../types';

export function UmaEcosystemView({ config, isLoading = false }: UmaEcosystemViewProps) {
  const t = useTranslations();

  const supportedChains = useMemo(
    () => config.supportedChains.map((chain) => chain.toString()),
    [config.supportedChains]
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 生态概览 - 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 核心指标 - Clean layout without colored backgrounds */}
        <section>
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Ecosystem Overview</h3>
            <p className="text-sm text-gray-500 mt-0.5">Key performance indicators</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">New Projects</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">-</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Integrations</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">-</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Supported Chains</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">
                  {config.supportedChains.length}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">Total Value Secured</span>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900">-</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* Supported Chains */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('uma.ecosystem.supportedChains')}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">Active blockchain networks</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1.5 text-sm font-medium border border-gray-200"
            >
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
              {chain}
            </span>
          ))}
        </div>
      </section>

      {/* Section Divider */}
      <div className="border-t border-gray-200" />

      {/* UMA Features */}
      <section>
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">{t('uma.ecosystem.features')}</h3>
          <p className="text-sm text-gray-500 mt-0.5">Core capabilities and advantages</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.optimisticOracle')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.optimisticOracleDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.disputeResolution')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.disputeResolutionDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.fastFinality')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">{t('uma.ecosystem.fastFinalityDesc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 border border-gray-200 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-600" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.decentralizedValidators')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.decentralizedValidatorsDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default UmaEcosystemView;
