'use client';

import { useTranslations } from 'next-intl';
import { EcosystemPanel } from '@/components/oracle/panels/EcosystemPanel';
import { API3EcosystemViewProps } from '../types';

export function API3EcosystemView({ isLoading }: API3EcosystemViewProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.ecosystem.integrations')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">50+</p>
          <p className="text-xs text-emerald-600 mt-1">+12%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.ecosystem.dapps')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">120+</p>
          <p className="text-xs text-emerald-600 mt-1">+8%</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.ecosystem.chains')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">8+</p>
          <p className="text-xs text-gray-500 mt-1">Multi-chain</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.ecosystem.tvl')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">$180M+</p>
          <p className="text-xs text-emerald-600 mt-1">+15%</p>
        </div>
      </div>

      <EcosystemPanel />
    </div>
  );
}
