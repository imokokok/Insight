'use client';

import { useState } from 'react';

import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Book,
  Key,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type API3ApiDocsProps } from '../types';

const getApiEndpoints = (t: (key: string) => string) => [
  {
    id: 'market',
    name: t('api3.developer.apiDocs.marketApi.name'),
    description: t('api3.developer.apiDocs.marketApi.description'),
    endpoints: [
      {
        method: 'GET',
        path: '/v1/market/price/{symbol}',
        description: '获取指定交易对的实时价格',
        params: [
          { name: 'symbol', type: 'string', required: true, description: '交易对符号，如 BTC/USD' },
        ],
        response: {
          symbol: 'BTC/USD',
          price: 67432.5,
          timestamp: 1711708800000,
          source: 'api3',
        },
      },
      {
        method: 'GET',
        path: '/v1/market/prices',
        description: '获取所有支持交易对的价格',
        params: [],
        response: {
          prices: [
            { symbol: 'BTC/USD', price: 67432.5, timestamp: 1711708800000 },
            { symbol: 'ETH/USD', price: 3456.78, timestamp: 1711708800000 },
          ],
        },
      },
      {
        method: 'GET',
        path: '/v1/market/historical/{symbol}',
        description: '获取历史价格数据',
        params: [
          { name: 'symbol', type: 'string', required: true, description: '交易对符号' },
          { name: 'from', type: 'timestamp', required: true, description: '开始时间戳' },
          { name: 'to', type: 'timestamp', required: true, description: '结束时间戳' },
          {
            name: 'interval',
            type: 'string',
            required: false,
            description: '时间间隔 (1h, 1d, 1w)',
          },
        ],
        response: {
          symbol: 'BTC/USD',
          data: [
            { timestamp: 1711708800000, price: 67432.5, volume: 1234567 },
            { timestamp: 1711795200000, price: 68100.0, volume: 1345678 },
          ],
        },
      },
    ],
  },
  {
    id: 'dao',
    name: t('api3.developer.apiDocs.daoApi.name'),
    description: t('api3.developer.apiDocs.daoApi.description'),
    endpoints: [
      {
        method: 'GET',
        path: '/v1/dao/proposals',
        description: '获取所有提案列表',
        params: [
          {
            name: 'status',
            type: 'string',
            required: false,
            description: '提案状态 (active, executed, defeated)',
          },
          { name: 'limit', type: 'number', required: false, description: '返回数量限制' },
        ],
        response: {
          proposals: [
            {
              id: 'prop-001',
              title: 'Increase Coverage Pool Stake',
              status: 'executed',
              votesFor: 15000000,
              votesAgainst: 2000000,
              endTime: 1711708800000,
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/v1/dao/staking/stats',
        description: '获取质押统计数据',
        params: [],
        response: {
          totalStaked: 45000000,
          stakers: 2345,
          apr: 12.5,
          lockupPeriod: '7 days',
        },
      },
      {
        method: 'GET',
        path: '/v1/dao/staking/rewards/{address}',
        description: '获取指定地址的质押奖励',
        params: [{ name: 'address', type: 'string', required: true, description: '钱包地址' }],
        response: {
          address: '0x1234...5678',
          stakedAmount: 10000,
          pendingRewards: 125.5,
          claimedRewards: 1500.0,
          apr: 12.5,
        },
      },
    ],
  },
  {
    id: 'dapi',
    name: t('api3.developer.apiDocs.dapiApi.name'),
    description: t('api3.developer.apiDocs.dapiApi.description'),
    endpoints: [
      {
        method: 'GET',
        path: '/v1/dapi/feeds',
        description: '获取所有dAPI数据源列表',
        params: [
          { name: 'chain', type: 'string', required: false, description: '区块链网络' },
          {
            name: 'category',
            type: 'string',
            required: false,
            description: '资产类别 (crypto, forex, commodities)',
          },
        ],
        response: {
          feeds: [
            {
              id: 'BTC/USD',
              name: 'Bitcoin to US Dollar',
              category: 'crypto',
              chains: ['ethereum', 'arbitrum', 'optimism'],
              updateFrequency: 'heartbeat: 24h, deviation: 0.5%',
              status: 'active',
            },
          ],
        },
      },
      {
        method: 'GET',
        path: '/v1/dapi/value/{dapiName}',
        description: '获取dAPI当前值',
        params: [
          { name: 'dapiName', type: 'string', required: true, description: 'dAPI名称' },
          { name: 'chainId', type: 'number', required: false, description: '链ID' },
        ],
        response: {
          dapiName: 'BTC/USD',
          value: 67432500000,
          timestamp: 1711708800000,
          signature: '0x...',
        },
      },
    ],
  },
];

const codeExamples: Record<string, Record<string, string>> = {
  javascript: {
    'GET /v1/market/price/{symbol}': `const response = await fetch(
  'https://api.api3.org/v1/market/price/BTC-USD',
  {
    headers: {
      'Authorization': 'Bearer YOUR_API_KEY',
      'Content-Type': 'application/json'
    }
  }
);

const data = await response.json();
console.log(data);
// { symbol: 'BTC/USD', price: 67432.50, timestamp: 1711708800000, source: 'api3' }`,
    'GET /v1/dapi/value/{dapiName}': `import { Api3ServerV1 } from '@api3/contracts';

const serverV1 = new Api3ServerV1(
  '0x...', // API3 ServerV1 contract address
  provider
);

// Read dAPI value
const dapiValue = await serverV1.readDataFeedValue(
  '0x...' // dAPI ID (bytes32)
);

const timestamp = await serverV1.readDataFeedTimestamp(
  '0x...' // dAPI ID (bytes32)
);

console.log('Value:', dapiValue.toString());
console.log('Timestamp:', new Date(timestamp * 1000));`,
  },
  python: {
    'GET /v1/market/price/{symbol}': `import requests

response = requests.get(
    'https://api.api3.org/v1/market/price/BTC-USD',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    }
)

data = response.json()
print(data)
# {'symbol': 'BTC/USD', 'price': 67432.50, 'timestamp': 1711708800000, 'source': 'api3'}`,
    'GET /v1/dapi/value/{dapiName}': `from web3 import Web3
from api3_contracts import Api3ServerV1

w3 = Web3(Web3.HTTPProvider('https://eth.llamarpc.com'))

server_v1 = Api3ServerV1(
    '0x...',  # API3 ServerV1 contract address
    w3
)

# Read dAPI value
dapi_id = Web3.keccak(text='BTC/USD')
value, timestamp = server_v1.readDataFeedValueWithTimestamp(dapi_id)

print(f'Value: {value}')
print(f'Timestamp: {timestamp}')`,
  },
  curl: {
    'GET /v1/market/price/{symbol}': `curl -X GET "https://api.api3.org/v1/market/price/BTC-USD" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    'GET /v1/dapi/value/{dapiName}': `# Using cast (foundry)
cast call 0x... "readDataFeedValueWithTimestamp(bytes32)" \\
  0x... \\
  --rpc-url https://eth.llamarpc.com`,
  },
};

const rateLimits = [
  { tier: 'Free', requests: '100/minute', burst: '20/second', price: '$0' },
  { tier: 'Pro', requests: '1,000/minute', burst: '100/second', price: '$49/month' },
  { tier: 'Enterprise', requests: '10,000/minute', burst: '1,000/second', price: 'Custom' },
];

export function API3ApiDocs(_props: API3ApiDocsProps) {
  const t = useTranslations();
  const apiEndpoints = getApiEndpoints(t);
  const [expandedApi, setExpandedApi] = useState<string>('market');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'javascript' | 'python' | 'curl'>(
    'javascript'
  );
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('api3.developer.apiDocs.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.developer.apiDocs.description') ||
              '完整的 API 接口参考文档，包含所有端点、参数和响应格式'}
          </p>
        </div>

        <div className="space-y-4">
          {apiEndpoints.map((api) => (
            <div
              key={api.id}
              className="bg-white border border-gray-100 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedApi(expandedApi === api.id ? '' : api.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Book className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-sm font-medium text-gray-900">{api.name}</h3>
                    <p className="text-xs text-gray-500">{api.description}</p>
                  </div>
                </div>
                {expandedApi === api.id ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedApi === api.id && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {api.endpoints.map((endpoint) => (
                    <div key={endpoint.path} className="p-4">
                      <button
                        onClick={() =>
                          setExpandedEndpoint(
                            expandedEndpoint === `${api.id}-${endpoint.path}`
                              ? null
                              : `${api.id}-${endpoint.path}`
                          )
                        }
                        className="w-full flex items-center gap-3 mb-2"
                      >
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            endpoint.method === 'GET'
                              ? 'bg-emerald-50 text-emerald-700'
                              : endpoint.method === 'POST'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {endpoint.method}
                        </span>
                        <code className="text-sm font-mono text-gray-700">{endpoint.path}</code>
                        <span className="text-sm text-gray-500">{endpoint.description}</span>
                      </button>

                      {expandedEndpoint === `${api.id}-${endpoint.path}` && (
                        <div className="mt-4 space-y-4">
                          {endpoint.params.length > 0 && (
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-2">
                                {t('api3.developer.apiDocs.parameters')}
                              </h4>
                              <div className="bg-gray-50 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200">
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        {t('api3.developer.apiDocs.paramName')}
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        {t('api3.developer.apiDocs.type')}
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        {t('api3.developer.apiDocs.required')}
                                      </th>
                                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                                        {t('api3.developer.apiDocs.description')}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {endpoint.params.map((param) => (
                                      <tr
                                        key={param.name}
                                        className="border-b border-gray-100 last:border-0"
                                      >
                                        <td className="px-3 py-2 font-mono text-gray-900">
                                          {param.name}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">{param.type}</td>
                                        <td className="px-3 py-2">
                                          {param.required ? (
                                            <span className="text-red-500 text-xs">
                                              {t('api3.developer.apiDocs.yes')}
                                            </span>
                                          ) : (
                                            <span className="text-gray-400 text-xs">
                                              {t('api3.developer.apiDocs.no')}
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                          {param.description}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">
                              {t('api3.developer.apiDocs.responseExample')}
                            </h4>
                            <div className="relative bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <button
                                onClick={() =>
                                  handleCopy(
                                    JSON.stringify(endpoint.response, null, 2),
                                    `response-${endpoint.path}`
                                  )
                                }
                                className="absolute top-2 right-2 p-1.5 rounded hover:bg-gray-700 transition-colors"
                              >
                                {copiedCode === `response-${endpoint.path}` ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <pre className="text-sm text-gray-100 font-mono">
                                {JSON.stringify(endpoint.response, null, 2)}
                              </pre>
                            </div>
                          </div>

                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">
                              {t('api3.developer.apiDocs.codeExample')}
                            </h4>
                            <div className="flex gap-2 mb-3">
                              {(['javascript', 'python', 'curl'] as const).map((lang) => (
                                <button
                                  key={lang}
                                  onClick={() => setSelectedLanguage(lang)}
                                  className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                    selectedLanguage === lang
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'text-gray-500 hover:text-gray-700'
                                  }`}
                                >
                                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                                </button>
                              ))}
                            </div>
                            <div className="relative bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <button
                                onClick={() =>
                                  handleCopy(
                                    codeExamples[selectedLanguage][
                                      `${endpoint.method} ${endpoint.path}`
                                    ] || '',
                                    `code-${endpoint.path}`
                                  )
                                }
                                className="absolute top-2 right-2 p-1.5 rounded hover:bg-gray-700 transition-colors"
                              >
                                {copiedCode === `code-${endpoint.path}` ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-gray-400" />
                                )}
                              </button>
                              <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                                {codeExamples[selectedLanguage][
                                  `${endpoint.method} ${endpoint.path}`
                                ] || '// Example not available'}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Key className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.apiDocs.authentication.title')}
          </h2>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
            <p className="text-sm text-gray-600">
              {t('api3.developer.apiDocs.authentication.description') ||
                '所有 API 请求需要在 Header 中包含 API Key 进行认证'}
            </p>
          </div>
          <div className="bg-gray-900 rounded-lg p-4">
            <pre className="text-sm text-gray-100 font-mono">
              {`Authorization: Bearer YOUR_API_KEY
Content-Type: application/json`}
            </pre>
          </div>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.apiDocs.rateLimits.title')}
          </h2>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {t('api3.developer.apiDocs.rateLimits.tier')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {t('api3.developer.apiDocs.rateLimits.requests')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {t('api3.developer.apiDocs.rateLimits.burst')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {t('api3.developer.apiDocs.rateLimits.price')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rateLimits.map((limit) => (
                <tr key={limit.tier} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{limit.tier}</td>
                  <td className="px-4 py-3 text-gray-600">{limit.requests}</td>
                  <td className="px-4 py-3 text-gray-600">{limit.burst}</td>
                  <td className="px-4 py-3 text-gray-600">{limit.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section className="flex items-start gap-4 py-2">
        <ExternalLink className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('api3.developer.apiDocs.moreResources')}
          </h3>
          <div className="mt-2 space-y-2">
            <a
              href="https://docs.api3.org/reference/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-emerald-600 hover:text-emerald-700"
            >
              {t('api3.developer.apiDocs.officialDocs')} →
            </a>
            <a
              href="https://docs.api3.org/guides/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-emerald-600 hover:text-emerald-700"
            >
              {t('api3.developer.apiDocs.devGuide')} →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
