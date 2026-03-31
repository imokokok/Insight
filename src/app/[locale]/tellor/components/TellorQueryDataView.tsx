'use client';

import { useState } from 'react';

import {
  Database,
  Search,
  Copy,
  CheckCircle,
  ExternalLink,
  Info,
  Code,
  Hash,
  FileText,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type TellorQueryDataViewProps } from '../types';

interface QueryExample {
  name: string;
  queryData: string;
  queryId: string;
  description: string;
}

const queryExamples: QueryExample[] = [
  {
    name: 'ETH/USD Spot Price',
    queryData: '["SpotPrice", "eth", "usd"]',
    queryId: '0x5c13cd9c...',
    description: 'Current ETH price in USD',
  },
  {
    name: 'BTC/USD TWAP',
    queryData: '["TWAP", "btc", "usd", 3600]',
    queryId: '0x8a2f4b1d...',
    description: '1-hour TWAP for BTC/USD',
  },
  {
    name: 'Custom Data',
    queryData: '["Custom", "weather", "nyc"]',
    queryId: '0x3e7c9a2f...',
    description: 'Custom weather data for NYC',
  },
];

const supportedTypes = [
  { type: 'SpotPrice', description: 'Current spot price for any asset pair' },
  { type: 'TWAP', description: 'Time-weighted average price' },
  { type: 'RNG', description: 'Random number generation' },
  { type: 'Custom', description: 'Custom query types' },
];

export function TellorQueryDataView({ isLoading }: TellorQueryDataViewProps) {
  const t = useTranslations('tellor');
  const [queryData, setQueryData] = useState('');
  const [decodedResult, setDecodedResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDecode = () => {
    // Mock decode functionality
    if (queryData.trim()) {
      setDecodedResult(`Query Type: SpotPrice\nAsset: ETH\nCurrency: USD\nQuery ID: 0x5c13cd9c...`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Query ID Decoder Tool */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cyan-50 rounded-lg">
            <Hash className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h3 className="text-base font-medium text-gray-900">{t('queryData.queryTool')}</h3>
            <p className="text-xs text-gray-500">{t('queryData.queryIdDescription')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              {t('queryData.enterQueryData')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryData}
                onChange={(e) => setQueryData(e.target.value)}
                placeholder='["SpotPrice", "eth", "usd"]'
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
              />
              <button
                onClick={handleDecode}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {t('queryData.decode')}
              </button>
            </div>
          </div>

          {decodedResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  {t('queryData.decodedResult')}
                </h4>
                <button
                  onClick={() => copyToClipboard(decodedResult)}
                  className="text-gray-400 hover:text-cyan-600 transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                {decodedResult}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Supported Query Types */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('queryData.supportedTypes')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supportedTypes.map((type, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-gray-100 hover:border-cyan-200 hover:bg-cyan-50/30 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <Code className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-gray-900">{type.type}</span>
              </div>
              <p className="text-xs text-gray-500">{type.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Query Examples */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">{t('queryData.popularQueries')}</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {queryExamples.map((example, index) => (
            <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">{example.name}</h4>
                <button
                  onClick={() => copyToClipboard(example.queryData)}
                  className="text-gray-400 hover:text-cyan-600 transition-colors"
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">{example.description}</p>
              <div className="flex items-center gap-4">
                <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                  {example.queryData}
                </code>
                <span className="text-xs text-cyan-600">{example.queryId}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Data Structure Info */}
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100 p-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-cyan-900">{t('queryData.whatIsQueryId')}</h4>
            <p className="text-xs text-cyan-700 mt-1">{t('queryData.queryIdDescription')}</p>
            <div className="mt-3 p-3 bg-white/50 rounded-lg">
              <p className="text-xs text-cyan-800 font-mono">Query ID = keccak256(Query Data)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
