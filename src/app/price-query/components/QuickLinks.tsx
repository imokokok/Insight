'use client';

import { useI18n } from '@/lib/i18n/context';
import { Icons } from './Icons';

export function QuickLinks() {
  const { t } = useI18n();

  return (
    <div>
      <h2 id="quick-links-title" className="text-lg font-semibold text-gray-900 mb-4">
        {t('priceQuery.quickLinks.title')}
      </h2>
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        role="navigation"
        aria-labelledby="quick-links-title"
      >
        <a
          href="/cross-chain"
          className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          aria-label={t('priceQuery.quickLinks.crossChain')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600" aria-hidden="true">
              <Icons.blockchain />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                {t('priceQuery.quickLinks.crossChain')}
              </p>
              <p className="text-xs text-gray-500">
                {t('priceQuery.quickLinks.crossChainDesc')}
              </p>
            </div>
          </div>
        </a>
        <a
          href="/cross-oracle"
          className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          aria-label={t('priceQuery.quickLinks.crossOracle')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600" aria-hidden="true">
              <Icons.oracle />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                {t('priceQuery.quickLinks.crossOracle')}
              </p>
              <p className="text-xs text-gray-500">
                {t('priceQuery.quickLinks.crossOracleDesc')}
              </p>
            </div>
          </div>
        </a>
        <a
          href="/chainlink"
          className="group p-4 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          aria-label={t('navbar.chainlink')}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 text-green-600" aria-hidden="true">
              <Icons.currency />
            </div>
            <div>
              <p className="font-semibold text-gray-900 group-hover:text-gray-700">
                {t('navbar.chainlink')}
              </p>
              <p className="text-xs text-gray-500">
                {t('priceQuery.quickLinks.chainlinkDesc')}
              </p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
