'use client';

import { useTranslations } from 'next-intl';

const services = [
  {
    id: 'data-feeds',
    name: 'Data Feeds',
    description: 'Secure, reliable, and decentralized price reference data for DeFi',
    features: ['High-Quality Data', 'Decentralized Infrastructure', 'Proven Oracle Networks'],
    status: 'active',
  },
  {
    id: 'vrf',
    name: 'VRF (Verifiable Random Function)',
    description: 'Provably fair and verifiable random number generation',
    features: ['Cryptographic Proof', 'On-Chain Verification', 'Fair Gaming'],
    status: 'active',
  },
  {
    id: 'keepers',
    name: 'Automation (Keepers)',
    description: 'Reliable smart contract automation with decentralized execution',
    features: ['Decentralized Execution', 'Custom Logic', 'Cost-Efficient'],
    status: 'active',
  },
  {
    id: 'ccip',
    name: 'CCIP (Cross-Chain Interoperability)',
    description: 'Secure cross-chain messaging and token transfers',
    features: ['Cross-Chain Messaging', 'Token Transfers', 'Global Standards'],
    status: 'active',
  },
  {
    id: 'functions',
    name: 'Functions',
    description: 'Connect smart contracts to any API and perform custom computations',
    features: ['Custom Computations', 'API Connectivity', 'Serverless'],
    status: 'beta',
  },
  {
    id: 'proof-of-reserve',
    name: 'Proof of Reserve',
    description: 'Verify asset backing for stablecoins and wrapped tokens',
    features: ['Asset Verification', 'Real-Time Monitoring', 'Transparency'],
    status: 'active',
  },
];

export function ChainlinkServicesView() {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">{service.name}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                service.status === 'active'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {service.status === 'active' ? 'Active' : 'Beta'}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">{service.description}</p>
            <div className="flex flex-wrap gap-2">
              {service.features.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chainlink.services.overview')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-gray-900">6</p>
            <p className="text-sm text-gray-500 mt-1">{t('chainlink.services.total')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-emerald-600">5</p>
            <p className="text-sm text-gray-500 mt-1">{t('chainlink.services.active')}</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-3xl font-bold text-amber-600">1</p>
            <p className="text-sm text-gray-500 mt-1">{t('chainlink.services.beta')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
