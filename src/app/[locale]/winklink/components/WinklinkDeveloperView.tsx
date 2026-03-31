'use client';

import { useState } from 'react';

import {
  Code,
  ExternalLink,
  Copy,
  Check,
  FileText,
  Github,
  MessageCircle,
  BookOpen,
  Wallet,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

export interface WinklinkDeveloperViewProps {
  className?: string;
}

interface ContractAddress {
  network: string;
  address: string;
  label: string;
}

interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: string;
}

interface ExternalLinkItem {
  title: string;
  description: string;
  url: string;
  icon: React.ReactNode;
}

interface QuickStartStep {
  step: number;
  title: string;
  description: string;
  code?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <Check className="w-4 h-4 text-emerald-500" />
      ) : (
        <Copy className="w-4 h-4 text-gray-400" />
      )}
    </button>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <span className="text-xs text-gray-500 bg-gray-700 px-2 py-0.5 rounded">{language}</span>
        <button
          onClick={handleCopy}
          className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 transition-colors"
          title={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-400" />
          ) : (
            <Copy className="w-4 h-4 text-gray-400" />
          )}
        </button>
      </div>
      <pre className="bg-gray-900 text-gray-100 p-4 pt-10 rounded-lg overflow-x-auto text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function WinklinkDeveloperView({ className }: WinklinkDeveloperViewProps) {
  const t = useTranslations();

  const contractAddresses: ContractAddress[] = [
    {
      network: 'TRON Mainnet',
      address: 'TVpBe6XqQZv5sJXjDk8f1R5nF8vZqW3xY7',
      label: 'TRON',
    },
    {
      network: 'BNB Chain',
      address: '0x8A7dD7Cc8Bc3c2FfE9D5dE7E6f3cB2A1D9E8F7C6',
      label: 'BSC',
    },
    {
      network: 'BTTC',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      label: 'BTTC',
    },
  ];

  const codeExamples: CodeExample[] = [
    {
      title: t('winklink.developer.priceFeedExample'),
      description: t('winklink.developer.priceFeedDesc'),
      language: 'solidity',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface WinklinkPriceFeed {
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
    
    function decimals() external view returns (uint8);
}

contract PriceConsumer {
    WinklinkPriceFeed internal priceFeed;
    
    constructor(address _priceFeedAddress) {
        priceFeed = WinklinkPriceFeed(_priceFeedAddress);
    }
    
    function getLatestPrice() public view returns (int256) {
        (
            /* uint80 roundId */,
            int256 price,
            /* uint256 startedAt */,
            /* uint256 updatedAt */,
            /* uint80 answeredInRound */
        ) = priceFeed.latestRoundData();
        return price;
    }
}`,
    },
    {
      title: t('winklink.developer.vrfExample'),
      description: t('winklink.developer.vrfDesc'),
      language: 'solidity',
      code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface WinklinkVRF {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}

contract VRFConsumer is VRFConsumerBase {
    WinklinkVRF internal vrfCoordinator;
    bytes32 internal keyHash;
    uint64 internal subscriptionId;
    
    uint256[] public randomResults;
    
    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint64 _subscriptionId
    ) VRFConsumerBase(_vrfCoordinator) {
        vrfCoordinator = WinklinkVRF(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subscriptionId;
    }
    
    function requestRandomNumber() external returns (uint256 requestId) {
        return vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            3, // confirmations
            100000, // gas limit
            1 // num words
        );
    }
    
    function fulfillRandomWords(
        uint256 /* requestId */,
        uint256[] memory randomWords
    ) internal override {
        randomResults = randomWords;
    }
}`,
    },
  ];

  const quickStartSteps: QuickStartStep[] = [
    {
      step: 1,
      title: t('winklink.developer.step1Title'),
      description: t('winklink.developer.step1Desc'),
      code: 'import "@winklink/contracts/src/v0.8/interfaces/WinklinkPriceFeed.sol";',
    },
    {
      step: 2,
      title: t('winklink.developer.step2Title'),
      description: t('winklink.developer.step2Desc'),
    },
    {
      step: 3,
      title: t('winklink.developer.step3Title'),
      description: t('winklink.developer.step3Desc'),
    },
  ];

  const externalLinks: ExternalLinkItem[] = [
    {
      title: t('winklink.developer.docsTitle'),
      description: t('winklink.developer.docsDesc'),
      url: 'https://docs.winklink.org',
      icon: <BookOpen className="w-5 h-5" />,
    },
    {
      title: t('winklink.developer.githubTitle'),
      description: t('winklink.developer.githubDesc'),
      url: 'https://github.com/winklink-org',
      icon: <Github className="w-5 h-5" />,
    },
    {
      title: t('winklink.developer.tronDevTitle'),
      description: t('winklink.developer.tronDevDesc'),
      url: 'https://developers.tron.network',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      title: t('winklink.developer.discordTitle'),
      description: t('winklink.developer.discordDesc'),
      url: 'https://discord.gg/winklink',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      title: t('winklink.developer.telegramTitle'),
      description: t('winklink.developer.telegramDesc'),
      url: 'https://t.me/winklink',
      icon: <MessageCircle className="w-5 h-5" />,
    },
  ];

  return (
    <div className={`space-y-8 ${className || ''}`}>
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {t('winklink.developer.title')}
        </h2>
        <p className="text-sm text-gray-500">{t('winklink.developer.subtitle')}</p>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('winklink.developer.contractAddresses')}
          </h3>
        </div>
        <div className="space-y-3">
          {contractAddresses.map((contract) => (
            <div
              key={contract.network}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                  {contract.label}
                </span>
                <span className="text-sm text-gray-600">{contract.network}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-gray-800 bg-white px-3 py-1.5 rounded border border-gray-200">
                  {contract.address.length > 20
                    ? `${contract.address.slice(0, 10)}...${contract.address.slice(-8)}`
                    : contract.address}
                </code>
                <CopyButton text={contract.address} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('winklink.developer.integrationExamples')}
          </h3>
        </div>
        <div className="space-y-6">
          {codeExamples.map((example, index) => (
            <div key={index}>
              <div className="mb-3">
                <h4 className="text-sm font-medium text-gray-900">{example.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{example.description}</p>
              </div>
              <CodeBlock code={example.code} language={example.language} />
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('winklink.developer.quickStart')}
          </h3>
        </div>
        <div className="space-y-4">
          {quickStartSteps.map((step) => (
            <div key={step.step} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-semibold">
                  {step.step}
                </div>
              </div>
              <div className="flex-1 pt-1">
                <h4 className="text-sm font-medium text-gray-900">{step.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                {step.code && (
                  <div className="mt-2 flex items-center gap-2 bg-gray-100 rounded px-3 py-2">
                    <code className="text-xs font-mono text-gray-700 flex-1">{step.code}</code>
                    <CopyButton text={step.code} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="flex items-center gap-2 mb-4">
          <ExternalLink className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">
            {t('winklink.developer.externalLinks')}
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {externalLinks.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 hover:border-gray-200 transition-colors group"
            >
              <div className="text-gray-500 group-hover:text-gray-700 transition-colors">
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <h4 className="text-sm font-medium text-gray-900">{link.title}</h4>
                  <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
