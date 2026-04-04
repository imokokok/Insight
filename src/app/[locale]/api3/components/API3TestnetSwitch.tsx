'use client';

import { useState } from 'react';

import {
  Network,
  TestTube,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Coins,
  Link as LinkIcon,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type API3TestnetSwitchProps } from '../types';

interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  faucetUrl: string;
  api3ServerAddress: string;
  nativeToken: string;
}

const networkConfigs: Record<'mainnet' | 'testnet', NetworkConfig[]> = {
  mainnet: [
    {
      name: 'Ethereum',
      chainId: 1,
      rpcUrl: 'https://eth.llamarpc.com',
      explorerUrl: 'https://etherscan.io',
      faucetUrl: '',
      api3ServerAddress: '0x3da0De4057c61622ea9445d9D4F28815A3cA0e5a',
      nativeToken: 'ETH',
    },
    {
      name: 'Arbitrum',
      chainId: 42161,
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io',
      faucetUrl: '',
      api3ServerAddress: '0x3da0De4057c61622ea9445d9D4F28815A3cA0e5a',
      nativeToken: 'ETH',
    },
    {
      name: 'Optimism',
      chainId: 10,
      rpcUrl: 'https://mainnet.optimism.io',
      explorerUrl: 'https://optimistic.etherscan.io',
      faucetUrl: '',
      api3ServerAddress: '0x3da0De4057c61622ea9445d9D4F28815A3cA0e5a',
      nativeToken: 'ETH',
    },
  ],
  testnet: [
    {
      name: 'Sepolia',
      chainId: 11155111,
      rpcUrl: 'https://rpc.sepolia.org',
      explorerUrl: 'https://sepolia.etherscan.io',
      faucetUrl: 'https://sepoliafaucet.com',
      api3ServerAddress: '0x9E4E7d2aF7D0d5B3E8A5c6D7F8E9A0B1C2D3E4F5',
      nativeToken: 'SepoliaETH',
    },
    {
      name: 'Arbitrum Sepolia',
      chainId: 421614,
      rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
      explorerUrl: 'https://sepolia.arbiscan.io',
      faucetUrl: 'https://faucet.quicknode.com/arbitrum/sepolia',
      api3ServerAddress: '0x9E4E7d2aF7D0d5B3E8A5c6D7F8E9A0B1C2D3E4F5',
      nativeToken: 'SepoliaETH',
    },
    {
      name: 'Optimism Sepolia',
      chainId: 11155420,
      rpcUrl: 'https://sepolia.optimism.io',
      explorerUrl: 'https://sepolia-optimism.etherscan.io',
      faucetUrl: 'https://faucet.quicknode.com/optimism/sepolia',
      api3ServerAddress: '0x9E4E7d2aF7D0d5B3E8A5c6D7F8E9A0B1C2D3E4F5',
      nativeToken: 'SepoliaETH',
    },
  ],
};

const testTokens = [
  { name: 'API3 Test Token', symbol: 'tAPI3', address: '0x...', faucet: 'https://faucet.api3.org' },
  { name: 'Test USDC', symbol: 'tUSDC', address: '0x...', faucet: 'https://faucet.api3.org' },
];

export function API3TestnetSwitch({ currentNetwork, onNetworkChange }: API3TestnetSwitchProps) {
  const t = useTranslations();
  const [selectedChain, setSelectedChain] = useState<string>('Ethereum');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCopy = async (address: string, id: string) => {
    await navigator.clipboard.writeText(address);
    setCopiedAddress(id);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const currentConfigs = networkConfigs[currentNetwork];
  const selectedConfig = currentConfigs.find((c) => c.name === selectedChain) || currentConfigs[0];

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.testnet.title')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.developer.testnet.description') ||
              '在主网和测试网之间切换，获取相应的配置信息'}
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => onNetworkChange('mainnet')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              currentNetwork === 'mainnet'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Network
                className={`w-5 h-5 ${currentNetwork === 'mainnet' ? 'text-emerald-600' : 'text-gray-400'}`}
              />
              <span
                className={`font-medium ${currentNetwork === 'mainnet' ? 'text-emerald-700' : 'text-gray-700'}`}
              >
                {t('api3.developer.testnet.mainnet')}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {t('api3.developer.testnet.mainnetDesc')}
            </p>
          </button>

          <button
            onClick={() => onNetworkChange('testnet')}
            className={`flex-1 p-4 rounded-lg border-2 transition-all ${
              currentNetwork === 'testnet'
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <TestTube
                className={`w-5 h-5 ${currentNetwork === 'testnet' ? 'text-emerald-600' : 'text-gray-400'}`}
              />
              <span
                className={`font-medium ${currentNetwork === 'testnet' ? 'text-emerald-700' : 'text-gray-700'}`}
              >
                {t('api3.developer.testnet.testnet')}
              </span>
            </div>
            <p className="text-xs text-gray-500 text-center">
              {t('api3.developer.testnet.testnetDesc')}
            </p>
          </button>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {currentConfigs.map((config) => (
            <button
              key={config.chainId}
              onClick={() => setSelectedChain(config.name)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedChain === config.name
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {config.name}
            </button>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('api3.developer.testnet.config.title')}
          </h3>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('api3.developer.testnet.config.networkName')}
              </span>
              <span className="text-sm font-medium text-gray-900">{selectedConfig.name}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('api3.developer.testnet.config.chainId')}
              </span>
              <span className="text-sm font-mono text-gray-900">{selectedConfig.chainId}</span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('api3.developer.testnet.config.rpcUrl')}
              </span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-gray-900 truncate max-w-[200px]">
                  {selectedConfig.rpcUrl}
                </code>
                <button
                  onClick={() => handleCopy(selectedConfig.rpcUrl, 'rpc')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {copiedAddress === 'rpc' ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('api3.developer.testnet.config.nativeToken')}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {selectedConfig.nativeToken}
              </span>
            </div>
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {t('api3.developer.testnet.config.api3ServerAddress')}
              </span>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-gray-900 truncate max-w-[200px]">
                  {selectedConfig.api3ServerAddress}
                </code>
                <button
                  onClick={() => handleCopy(selectedConfig.api3ServerAddress, 'api3')}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  {copiedAddress === 'api3' ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <a
            href={selectedConfig.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <LinkIcon className="w-4 h-4" />
            {t('api3.developer.testnet.config.blockExplorer')}
          </a>
          {selectedConfig.faucetUrl && (
            <a
              href={selectedConfig.faucetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100"
            >
              <Coins className="w-4 h-4" />
              {t('api3.developer.testnet.config.getTestTokens')}
            </a>
          )}
        </div>
      </section>

      {currentNetwork === 'testnet' && (
        <>
          <div className="border-t border-gray-200" />

          <section>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                {t('api3.developer.testnet.testTokens.title')}
              </h3>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800">
                  {t('api3.developer.testnet.testTokens.warning')}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {testTokens.map((token) => (
                <div key={token.symbol} className="bg-white border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{token.name}</span>
                      <span className="text-xs text-gray-500 ml-2">({token.symbol})</span>
                    </div>
                    <a
                      href={token.faucet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700"
                    >
                      获取 <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs font-mono text-gray-600">{token.address}</code>
                    <button
                      onClick={() => handleCopy(token.address, token.symbol)}
                      className="p-0.5 hover:bg-gray-100 rounded"
                    >
                      {copiedAddress === token.symbol ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      <div className="border-t border-gray-200" />

      <section className="flex items-start gap-4 py-2">
        <ExternalLink className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('api3.developer.testnet.resources.title')}
          </h3>
          <div className="mt-2 space-y-2">
            <a
              href="https://docs.api3.org/guides/dapis/read-from-dapi/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-emerald-600 hover:text-emerald-700"
            >
              {t('api3.developer.testnet.resources.readDapi')} →
            </a>
            <a
              href="https://docs.api3.org/reference/chains/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-emerald-600 hover:text-emerald-700"
            >
              {t('api3.developer.testnet.resources.supportedChains')} →
            </a>
            <a
              href="https://market.api3.org"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm text-emerald-600 hover:text-emerald-700"
            >
              {t('api3.developer.testnet.resources.api3Market')} →
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
