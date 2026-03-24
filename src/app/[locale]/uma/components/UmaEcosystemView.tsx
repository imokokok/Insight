'use client';

import { useTranslations } from 'next-intl';
import { UmaEcosystemViewProps } from '../types';

export function UmaEcosystemView({ config }: UmaEcosystemViewProps) {
  const t = useTranslations();

  const integrations = [
    { name: 'Across Protocol', category: 'bridge', tvl: '$450M' },
    { name: 'Polymarket', category: 'prediction', tvl: '$120M' },
    { name: 'SuperUMAn', category: 'community', tvl: '$25M' },
    { name: 'Risk Labs', category: 'infrastructure', tvl: '$180M' },
    { name: 'Outcome.Finance', category: 'derivatives', tvl: '$85M' },
    { name: 'Sherlock', category: 'insurance', tvl: '$45M' },
  ];

  const supportedChains = config.supportedChains.map((chain) => chain.toString());

  return (
    <div className="space-y-4">
      {/* Ecosystem Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.ecosystem.overview')}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {t('uma.ecosystem.description', { name: config.name })}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.ecosystem.integrations')}
            </p>
            <p className="text-xl font-bold text-gray-900">25+</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.ecosystem.totalValueSecured')}
            </p>
            <p className="text-xl font-bold text-gray-900">$905M+</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.ecosystem.supportedChains')}
            </p>
            <p className="text-xl font-bold text-gray-900">{config.supportedChains.length}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              {t('uma.ecosystem.activeProjects')}
            </p>
            <p className="text-xl font-bold text-gray-900">40+</p>
          </div>
        </div>
      </div>

      {/* Supported Chains */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.ecosystem.supportedChains')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {supportedChains.map((chain, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-md border border-red-100"
            >
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2" />
              {chain}
            </span>
          ))}
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.ecosystem.integrations')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {integrations.map((integration, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900">
                  {integration.name}
                </h4>
                <span className="text-xs text-gray-500 capitalize">
                  {integration.category}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                TVL: <span className="font-medium text-gray-900">{integration.tvl}</span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* UMA Features */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.ecosystem.features')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
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
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.ecosystem.fastFinality')}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {t('uma.ecosystem.fastFinalityDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
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
      </div>
    </div>
  );
}
