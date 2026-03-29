'use client';

import { useState } from 'react';

import { Code2, BookOpen, Download, Network } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { API3ApiDocs } from './API3ApiDocs';
import { API3IntegrationGuide } from './API3IntegrationGuide';
import { API3SdkDownloads } from './API3SdkDownloads';
import { API3TestnetSwitch } from './API3TestnetSwitch';

type DeveloperTab = 'api-docs' | 'guide' | 'sdk' | 'testnet';

const tabs: { id: DeveloperTab; icon: React.ReactNode; labelKey: string }[] = [
  { id: 'api-docs', icon: <Code2 className="w-4 h-4" />, labelKey: 'api3.developer.tabs.apiDocs' },
  { id: 'guide', icon: <BookOpen className="w-4 h-4" />, labelKey: 'api3.developer.tabs.guide' },
  { id: 'sdk', icon: <Download className="w-4 h-4" />, labelKey: 'api3.developer.tabs.sdk' },
  { id: 'testnet', icon: <Network className="w-4 h-4" />, labelKey: 'api3.developer.tabs.testnet' },
];

export function API3DeveloperView() {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<DeveloperTab>('api-docs');
  const [currentNetwork, setCurrentNetwork] = useState<'mainnet' | 'testnet'>('mainnet');

  const renderContent = () => {
    switch (activeTab) {
      case 'api-docs':
        return <API3ApiDocs locale={typeof window !== 'undefined' ? document.documentElement.lang : 'en'} />;
      case 'guide':
        return <API3IntegrationGuide />;
      case 'sdk':
        return <API3SdkDownloads />;
      case 'testnet':
        return (
          <API3TestnetSwitch
            currentNetwork={currentNetwork}
            onNetworkChange={setCurrentNetwork}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {t('api3.developer.title') || '开发者工具'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {t('api3.developer.description') || 'API 集成工具、SDK 下载和技术文档'}
        </p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-emerald-500 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {t(tab.labelKey) || tab.id}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">{renderContent()}</div>
    </div>
  );
}
