'use client';

import { useState, useEffect } from 'react';

import {
  Layers,
  Zap,
  Database,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Code,
  FileText,
  Github,
  BookOpen,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  TrendingDown,
  Clock,
  Globe,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Sparkles,
  Play,
  Pause,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type RedStoneERC7412ViewProps } from '../types';

export function RedStoneERC7412View({ isLoading: _isLoading }: RedStoneERC7412ViewProps) {
  const t = useTranslations();

  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [activeMode, setActiveMode] = useState<'push' | 'pull' | 'hybrid'>('hybrid');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const modeComparison = [
    {
      id: 'push' as const,
      name: t('redstone.erc7412.pushMode') || 'Push Mode',
      icon: Database,
      color: '#3b82f6',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      description: t('redstone.erc7412.pushModeDesc') || 'Oracle pushes data on-chain periodically',
      pros: [
        t('redstone.erc7412.pushPro1') || 'Simple integration',
        t('redstone.erc7412.pushPro2') || 'No client changes needed',
        t('redstone.erc7412.pushPro3') || 'Works with existing Chainlink integrations',
      ],
      cons: [
        t('redstone.erc7412.pushCon1') || 'High gas costs',
        t('redstone.erc7412.pushCon2') || 'Data may be stale',
        t('redstone.erc7412.pushCon3') || 'Inefficient for low-frequency usage',
      ],
    },
    {
      id: 'pull' as const,
      name: t('redstone.erc7412.pullMode') || 'Pull Mode',
      icon: Zap,
      color: '#22c55e',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-400',
      description:
        t('redstone.erc7412.pullModeDesc') || 'User fetches data on-demand with signatures',
      pros: [
        t('redstone.erc7412.pullPro1') || '70%+ gas savings',
        t('redstone.erc7412.pullPro2') || 'Always fresh data',
        t('redstone.erc7412.pullPro3') || 'Efficient for on-demand usage',
      ],
      cons: [
        t('redstone.erc7412.pullCon1') || 'Requires client integration',
        t('redstone.erc7412.pullCon2') || 'Need to handle signatures',
        t('redstone.erc7412.pullCon3') || 'Not compatible with all protocols',
      ],
    },
    {
      id: 'hybrid' as const,
      name: t('redstone.erc7412.hybridMode') || 'Hybrid Mode (ERC-7412)',
      icon: Layers,
      color: '#8b5cf6',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-400',
      description:
        t('redstone.erc7412.hybridModeDesc') || 'Best of both worlds with automatic fallback',
      pros: [
        t('redstone.erc7412.hybridPro1') || 'Automatic mode selection',
        t('redstone.erc7412.hybridPro2') || 'Chainlink-compatible',
        t('redstone.erc7412.hybridPro3') || 'Optimal gas efficiency',
        t('redstone.erc7412.hybridPro4') || 'Fresh data guarantee',
      ],
      cons: [],
      featured: true,
    },
  ];

  const compatibilityMatrix = [
    {
      chain: 'Ethereum',
      push: true,
      pull: true,
      hybrid: true,
      protocols: ['Aave', 'Compound', 'Uniswap', 'Curve'],
    },
    {
      chain: 'Arbitrum',
      push: true,
      pull: true,
      hybrid: true,
      protocols: ['GMX', 'Radiant', 'SushiSwap'],
    },
    {
      chain: 'Optimism',
      push: true,
      pull: true,
      hybrid: true,
      protocols: ['Velodrome', 'Synthetix', 'Aave'],
    },
    {
      chain: 'Polygon',
      push: true,
      pull: true,
      hybrid: true,
      protocols: ['QuickSwap', 'Aave', 'Curve'],
    },
    {
      chain: 'Base',
      push: true,
      pull: true,
      hybrid: true,
      protocols: ['Aerodrome', 'Moonwell', 'Uniswap'],
    },
    {
      chain: 'BSC',
      push: true,
      pull: true,
      hybrid: false,
      protocols: ['PancakeSwap', 'Venus'],
    },
    {
      chain: 'Avalanche',
      push: true,
      pull: true,
      hybrid: true,
      protocols: ['Trader Joe', 'Benqi', 'Curve'],
    },
    {
      chain: 'Scroll',
      push: false,
      pull: true,
      hybrid: true,
      protocols: ['Aave', 'Uniswap'],
    },
  ];

  const developerResources = [
    {
      title: t('redstone.erc7412.docTitle') || 'ERC-7412 Documentation',
      description:
        t('redstone.erc7412.docDesc') || 'Complete technical specification and integration guide',
      icon: BookOpen,
      url: 'https://docs.redstone.finance/docs/introduction',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('redstone.erc7412.sdkTitle') || 'RedStone SDK',
      description:
        t('redstone.erc7412.sdkDesc') || 'TypeScript/JavaScript SDK for easy integration',
      icon: Code,
      url: 'https://github.com/redstone-finance/redstone-oracles-monorepo',
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      title: t('redstone.erc7412.githubTitle') || 'GitHub Repository',
      description: t('redstone.erc7412.githubDesc') || 'Open source contracts and examples',
      icon: Github,
      url: 'https://github.com/redstone-finance',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
    },
    {
      title: t('redstone.erc7412.exampleTitle') || 'Example Contracts',
      description: t('redstone.erc7412.exampleDesc') || 'Ready-to-use smart contract templates',
      icon: FileText,
      url: 'https://github.com/redstone-finance/redstone-oracles-monorepo/tree/main/packages/evm-example',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
  ];

  const keyFeatures = [
    {
      icon: TrendingDown,
      title: t('redstone.erc7412.featureGasTitle') || 'Optimized Gas Costs',
      description:
        t('redstone.erc7412.featureGasDesc') ||
        'Automatically selects the most cost-effective mode',
    },
    {
      icon: Clock,
      title: t('redstone.erc7412.featureFreshTitle') || 'Fresh Data Guarantee',
      description:
        t('redstone.erc7412.featureFreshDesc') ||
        'Data is always within acceptable staleness bounds',
    },
    {
      icon: Shield,
      title: t('redstone.erc7412.featureSecureTitle') || 'Chainlink Compatible',
      description:
        t('redstone.erc7412.featureSecureDesc') || 'Drop-in replacement for existing integrations',
    },
    {
      icon: RefreshCw,
      title: t('redstone.erc7412.featureFallbackTitle') || 'Automatic Fallback',
      description:
        t('redstone.erc7412.featureFallbackDesc') ||
        'Seamlessly switches between modes when needed',
    },
  ];

  const codeExample = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@redstone-finance/evm-connector/contracts/core/RedstoneConsumer.sol";

contract MyContract is RedstoneConsumer {
  using RedstoneConsumer for uint256;
  
  function getETHPrice() public view returns (uint256) {
    // ERC-7412 automatically handles Push/Pull/Hybrid
    uint256 price = getOracleNumericValueFromTxMsg("ETH");
    return price;
  }
  
  // No need to handle different modes manually!
  // The connector automatically:
  // 1. Checks if fresh data is available on-chain (Push)
  // 2. Falls back to Pull mode if needed
  // 3. Optimizes for gas efficiency
}`;

  const [isAnimating, setIsAnimating] = useState(true);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [animationStep, setAnimationStep] = useState(0);

  const scenarios = [
    {
      id: 'liquidation',
      name: t('redstone.erc7412.scenarioLiquidation') || 'Liquidation Event',
      icon: AlertTriangle,
      mode: 'push' as const,
      modeColor: '#3b82f6',
      modeName: t('redstone.erc7412.pushMode') || 'Push Mode',
      description:
        t('redstone.erc7412.scenarioLiquidationDesc') ||
        'When a position needs liquidation, fresh price data must be available immediately. Push mode ensures data is already on-chain.',
      steps: [
        {
          text: t('redstone.erc7412.liquidationStep1') || 'Position becomes undercollateralized',
          delay: 0,
        },
        {
          text: t('redstone.erc7412.liquidationStep2') || 'Liquidation bot checks on-chain price',
          delay: 1500,
        },
        {
          text: t('redstone.erc7412.liquidationStep3') || 'Data already available (Push mode)',
          delay: 3000,
        },
        {
          text: t('redstone.erc7412.liquidationStep4') || 'Liquidation executes instantly',
          delay: 4500,
        },
      ],
      benefits: [
        t('redstone.erc7412.instantAccess') || 'Instant data access',
        t('redstone.erc7412.noDelay') || 'No transaction delay',
        t('redstone.erc7412.timeCritical') || 'Time-critical operations',
      ],
    },
    {
      id: 'userTrade',
      name: t('redstone.erc7412.scenarioUserTrade') || 'User-Initiated Trade',
      icon: Users,
      mode: 'pull' as const,
      modeColor: '#22c55e',
      modeName: t('redstone.erc7412.pullMode') || 'Pull Mode',
      description:
        t('redstone.erc7412.scenarioUserTradeDesc') ||
        'When a user initiates a trade, fresh data is fetched on-demand, saving gas costs.',
      steps: [
        {
          text: t('redstone.erc7412.userTradeStep1') || 'User initiates swap transaction',
          delay: 0,
        },
        {
          text: t('redstone.erc7412.userTradeStep2') || 'Client fetches signed price data',
          delay: 1500,
        },
        {
          text: t('redstone.erc7412.userTradeStep3') || 'Data injected into transaction',
          delay: 3000,
        },
        {
          text: t('redstone.erc7412.userTradeStep4') || 'Fresh data, 70% gas savings',
          delay: 4500,
        },
      ],
      benefits: [
        t('redstone.erc7412.freshData') || 'Always fresh data',
        t('redstone.erc7412.gasSavings') || '70% gas savings',
        t('redstone.erc7412.onDemand') || 'On-demand efficiency',
      ],
    },
    {
      id: 'hybrid',
      name: t('redstone.erc7412.scenarioHybrid') || 'Automatic Mode Switching',
      icon: Sparkles,
      mode: 'hybrid' as const,
      modeColor: '#8b5cf6',
      modeName: t('redstone.erc7412.hybridMode') || 'Hybrid Mode',
      description:
        t('redstone.erc7412.scenarioHybridDesc') ||
        'ERC-7412 automatically selects the best mode based on data freshness and use case.',
      steps: [
        { text: t('redstone.erc7412.hybridStep1') || 'Smart contract requests price', delay: 0 },
        { text: t('redstone.erc7412.hybridStep2') || 'Check on-chain data freshness', delay: 1500 },
        { text: t('redstone.erc7412.hybridStep3') || 'Fresh? Use Push. Stale? Pull.', delay: 3000 },
        {
          text: t('redstone.erc7412.hybridStep4') || 'Optimal mode selected automatically',
          delay: 4500,
        },
      ],
      benefits: [
        t('redstone.erc7412.autoSelection') || 'Automatic selection',
        t('redstone.erc7412.bestOfBoth') || 'Best of both worlds',
        t('redstone.erc7412.zeroConfig') || 'Zero configuration',
      ],
    },
  ];

  const benefitsTable = [
    {
      metric: t('redstone.erc7412.metricGasCost') || 'Gas Cost',
      push: t('redstone.erc7412.high') || 'High',
      pushScore: 30,
      pull: t('redstone.erc7412.low') || 'Low',
      pullScore: 90,
      hybrid: t('redstone.erc7412.optimal') || 'Optimal',
      hybridScore: 95,
      icon: DollarSign,
    },
    {
      metric: t('redstone.erc7412.metricLatency') || 'Latency',
      push: t('redstone.erc7412.instant') || 'Instant',
      pushScore: 95,
      pull: t('redstone.erc7412.low') || 'Low',
      pullScore: 75,
      hybrid: t('redstone.erc7412.adaptive') || 'Adaptive',
      hybridScore: 90,
      icon: Clock,
    },
    {
      metric: t('redstone.erc7412.metricFreshness') || 'Data Freshness',
      push: t('redstone.erc7412.variable') || 'Variable',
      pushScore: 60,
      pull: t('redstone.erc7412.alwaysFresh') || 'Always Fresh',
      pullScore: 95,
      hybrid: t('redstone.erc7412.guaranteed') || 'Guaranteed',
      hybridScore: 95,
      icon: Activity,
    },
    {
      metric: t('redstone.erc7412.metricIntegration') || 'Integration Complexity',
      push: t('redstone.erc7412.simple') || 'Simple',
      pushScore: 90,
      pull: t('redstone.erc7412.moderate') || 'Moderate',
      pullScore: 60,
      hybrid: t('redstone.erc7412.simple') || 'Simple',
      hybridScore: 90,
      icon: Code,
    },
    {
      metric: t('redstone.erc7412.metricCompatibility') || 'Protocol Compatibility',
      push: t('redstone.erc7412.limited') || 'Limited',
      pushScore: 70,
      pull: t('redstone.erc7412.broad') || 'Broad',
      pullScore: 85,
      hybrid: t('redstone.erc7412.universal') || 'Universal',
      hybridScore: 95,
      icon: Globe,
    },
  ];

  useEffect(() => {
    if (!isAnimating) return;

    const stepInterval = setInterval(() => {
      setAnimationStep((prev) => {
        const nextStep = prev + 1;
        if (nextStep >= 4) {
          setTimeout(() => {
            setCurrentScenario((s) => (s + 1) % scenarios.length);
            setAnimationStep(0);
          }, 1500);
          return prev;
        }
        return nextStep;
      });
    }, 1500);

    return () => clearInterval(stepInterval);
  }, [isAnimating, scenarios.length]);

  return (
    <div className="space-y-6">
      {/* 核心特性概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {keyFeatures.map((feature, index) => (
          <div
            key={index}
            className="p-4 bg-white rounded-lg border border-gray-100 hover:border-purple-200 transition-colors"
          >
            <feature.icon className="w-5 h-5 text-purple-500 mb-2" />
            <h4 className="text-sm font-semibold text-gray-900">{feature.title}</h4>
            <p className="text-xs text-gray-500 mt-1">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* 标准概述 */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('overview')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Layers className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.erc7412.overview') || 'What is ERC-7412?'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.erc7412.overviewDesc') ||
                  'The hybrid oracle standard introduced by RedStone'}
              </p>
            </div>
          </div>
          {expandedSection === 'overview' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'overview' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-600">
                {t('redstone.erc7412.overviewText') ||
                  'ERC-7412 is a new Ethereum standard introduced by RedStone in 2025 that enables hybrid oracle data delivery. It combines the best aspects of Push and Pull models, allowing DeFi applications to fetch data on-demand while also supporting periodic updates for backward compatibility.'}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-600">1</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {t('redstone.erc7412.step1') || 'Hybrid Architecture'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {t('redstone.erc7412.step1Desc') ||
                    'Combines on-chain data feeds with off-chain signed data'}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-600">2</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {t('redstone.erc7412.step2') || 'Automatic Selection'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {t('redstone.erc7412.step2Desc') ||
                    'Smart contract automatically chooses the optimal data source'}
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-purple-50 to-white rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-purple-600">3</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {t('redstone.erc7412.step3') || 'Seamless Fallback'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {t('redstone.erc7412.step3Desc') ||
                    'Falls back to Pull mode when on-chain data is stale'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 混合模式对比 */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('modes')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Zap className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.erc7412.modeComparison') || 'Mode Comparison'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.erc7412.modeComparisonDesc') || 'Push vs Pull vs Hybrid modes'}
              </p>
            </div>
          </div>
          {expandedSection === 'modes' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'modes' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            {/* 模式选择器 */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {modeComparison.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                    activeMode === mode.id
                      ? `${mode.bgColor} ${mode.borderColor}`
                      : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <mode.icon className="w-4 h-4" style={{ color: mode.color }} />
                  <span className="text-sm font-medium text-gray-900">{mode.name}</span>
                  {mode.featured && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                      {t('redstone.erc7412.recommended') || 'Recommended'}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* 详细对比 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {modeComparison.map((mode) => (
                <div
                  key={mode.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    activeMode === mode.id
                      ? `${mode.bgColor} ${mode.borderColor} ring-2 ring-offset-2 ring-purple-500`
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${mode.color}20` }}
                    >
                      <mode.icon className="w-5 h-5" style={{ color: mode.color }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{mode.name}</h4>
                      <p className="text-xs text-gray-500">{mode.description}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-medium text-emerald-600 mb-2">
                        {t('redstone.erc7412.advantages') || 'Advantages'}
                      </p>
                      <div className="space-y-1">
                        {mode.pros.map((pro, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{pro}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {mode.cons.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-2">
                          {t('redstone.erc7412.limitations') || 'Limitations'}
                        </p>
                        <div className="space-y-1">
                          {mode.cons.map((con, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                              <div className="w-3.5 h-3.5 rounded-full bg-amber-100 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              </div>
                              <span>{con}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 工作流程图 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-4">
                {t('redstone.erc7412.hybridWorkflow') || 'ERC-7412 Hybrid Workflow'}
              </h4>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-gray-200">
                  <Database className="w-5 h-5 text-gray-500 mb-1" />
                  <span className="text-xs text-gray-600">
                    {t('redstone.erc7412.checkOnchain') || 'Check On-chain'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-gray-200">
                  <Clock className="w-5 h-5 text-blue-500 mb-1" />
                  <span className="text-xs text-gray-600">
                    {t('redstone.erc7412.checkFreshness') || 'Check Freshness'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col items-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <Layers className="w-5 h-5 text-purple-500 mb-1" />
                  <span className="text-xs text-purple-600 font-medium">
                    {t('redstone.erc7412.selectMode') || 'Select Mode'}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
                <div className="flex flex-col items-center p-3 bg-white rounded-lg border border-gray-200">
                  <Zap className="w-5 h-5 text-red-500 mb-1" />
                  <span className="text-xs text-gray-600">
                    {t('redstone.erc7412.deliverData') || 'Deliver Data'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 场景演示 */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('scenarios')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.erc7412.scenarioDemo') || 'Interactive Scenario Demo'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.erc7412.scenarioDemoDesc') ||
                  'See how each mode is used in real-world scenarios'}
              </p>
            </div>
          </div>
          {expandedSection === 'scenarios' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'scenarios' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {scenarios.map((scenario, index) => (
                <div
                  key={scenario.id}
                  className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    currentScenario === index
                      ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-200'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setCurrentScenario(index);
                    setAnimationStep(0);
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${scenario.modeColor}20` }}
                    >
                      <scenario.icon className="w-5 h-5" style={{ color: scenario.modeColor }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm">{scenario.name}</h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: `${scenario.modeColor}20`,
                            color: scenario.modeColor,
                          }}
                        >
                          {scenario.modeName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{scenario.description}</p>

                  <div className="space-y-2">
                    {scenario.steps.map((step, stepIndex) => (
                      <div
                        key={stepIndex}
                        className={`flex items-center gap-2 text-xs transition-all duration-300 ${
                          currentScenario === index && animationStep >= stepIndex
                            ? 'text-gray-900 font-medium'
                            : 'text-gray-400'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300 ${
                            currentScenario === index && animationStep >= stepIndex
                              ? 'bg-purple-500 text-white'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {currentScenario === index && animationStep >= stepIndex ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <span className="text-xs">{stepIndex + 1}</span>
                          )}
                        </div>
                        <span>{step.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                >
                  {isAnimating ? (
                    <>
                      <Pause className="w-4 h-4" />
                      {t('redstone.erc7412.pauseAnimation') || 'Pause'}
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      {t('redstone.erc7412.playAnimation') || 'Play'}
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setAnimationStep(0);
                    setCurrentScenario((s) => (s + 1) % scenarios.length);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('redstone.erc7412.nextScenario') || 'Next'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                {scenarios.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all ${
                      currentScenario === index ? 'bg-purple-500 w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-green-50 rounded-lg border border-purple-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('redstone.erc7412.currentBenefits') || 'Current Scenario Benefits'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {scenarios[currentScenario].benefits.map((benefit, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-xs font-medium text-gray-700 border border-gray-200"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 效益对比表格 */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('benefits')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.erc7412.benefitsTable') || 'Benefits Comparison Table'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.erc7412.benefitsTableDesc') ||
                  'Compare costs, latency, and freshness across modes'}
              </p>
            </div>
          </div>
          {expandedSection === 'benefits' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'benefits' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">
                      {t('redstone.erc7412.metric') || 'Metric'}
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-blue-600">
                      <div className="flex items-center justify-center gap-1">
                        <Database className="w-3.5 h-3.5" />
                        {t('redstone.erc7412.pushMode') || 'Push'}
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-emerald-600">
                      <div className="flex items-center justify-center gap-1">
                        <Zap className="w-3.5 h-3.5" />
                        {t('redstone.erc7412.pullMode') || 'Pull'}
                      </div>
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-purple-600">
                      <div className="flex items-center justify-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {t('redstone.erc7412.hybridMode') || 'Hybrid'}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {benefitsTable.map((row, index) => (
                    <tr
                      key={row.metric}
                      className={index < benefitsTable.length - 1 ? 'border-b border-gray-100' : ''}
                    >
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <row.icon className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{row.metric}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-600 mb-1">{row.push}</span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${row.pushScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-gray-600 mb-1">{row.pull}</span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${row.pullScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-col items-center">
                          <span className="text-xs text-purple-600 font-medium mb-1">
                            {row.hybrid}
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 max-w-[80px]">
                            <div
                              className="bg-purple-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${row.hybridScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-center">
                <Database className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-blue-700">
                  {t('redstone.erc7412.pushBest') || 'Best for time-sensitive operations'}
                </p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                <Zap className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-emerald-700">
                  {t('redstone.erc7412.pullBest') || 'Best for gas efficiency'}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 text-center">
                <Layers className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                <p className="text-xs font-medium text-purple-700">
                  {t('redstone.erc7412.hybridBest') || 'Best overall performance'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 兼容性矩阵 */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('compatibility')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.erc7412.compatibility') || 'Chain & Protocol Compatibility'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.erc7412.compatibilityDesc') || 'Supported chains and protocols'}
              </p>
            </div>
          </div>
          {expandedSection === 'compatibility' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'compatibility' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-600">
                      {t('redstone.erc7412.chain') || 'Chain'}
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">
                      {t('redstone.erc7412.push') || 'Push'}
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-gray-600">
                      {t('redstone.erc7412.pull') || 'Pull'}
                    </th>
                    <th className="text-center py-3 px-2 font-medium text-purple-600">
                      {t('redstone.erc7412.hybrid') || 'Hybrid'}
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600">
                      {t('redstone.erc7412.protocols') || 'Popular Protocols'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {compatibilityMatrix.map((row, index) => (
                    <tr
                      key={row.chain}
                      className={
                        index < compatibilityMatrix.length - 1 ? 'border-b border-gray-100' : ''
                      }
                    >
                      <td className="py-3 px-2 font-medium text-gray-900">{row.chain}</td>
                      <td className="py-3 px-2 text-center">
                        {row.push ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {row.pull ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 mx-auto" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {row.hybrid ? (
                          <CheckCircle className="w-4 h-4 text-purple-500 mx-auto" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-200 mx-auto" />
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex flex-wrap gap-1">
                          {row.protocols.map((protocol) => (
                            <span
                              key={protocol}
                              className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600"
                            >
                              {protocol}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('redstone.erc7412.supported') || 'Supported'}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3.5 h-3.5 rounded-full bg-gray-200" />
                <span>{t('redstone.erc7412.notSupported') || 'Not Supported'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 开发者资源 */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <button
          onClick={() => toggleSection('resources')}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Code className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900">
                {t('redstone.erc7412.devResources') || 'Developer Resources'}
              </h3>
              <p className="text-xs text-gray-500">
                {t('redstone.erc7412.devResourcesDesc') || 'Documentation, SDK, and examples'}
              </p>
            </div>
          </div>
          {expandedSection === 'resources' ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {expandedSection === 'resources' && (
          <div className="p-4 pt-0 border-t border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {developerResources.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-all group ${resource.bgColor}`}
                >
                  <div className="flex items-start gap-3">
                    <resource.icon className={`w-5 h-5 ${resource.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-gray-900">{resource.title}</h4>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{resource.description}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>

            {/* 代码示例 */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                {t('redstone.erc7412.codeExample') || 'Quick Integration Example'}
              </h4>
              <div className="relative">
                <pre className="p-4 bg-gray-900 rounded-lg overflow-x-auto text-xs text-gray-100">
                  <code>{codeExample}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(codeExample)}
                  className="absolute top-2 right-2 p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  title={t('redstone.erc7412.copyCode') || 'Copy code'}
                >
                  <Code className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 技术规格 */}
      <div className="bg-gradient-to-r from-purple-50 to-red-50 rounded-lg border border-purple-100 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('redstone.erc7412.techSpecs') || 'Technical Specifications'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">ERC-7412</p>
            <p className="text-xs text-gray-500">
              {t('redstone.erc7412.standard') || 'EIP Standard'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">2025</p>
            <p className="text-xs text-gray-500">
              {t('redstone.erc7412.introduced') || 'Year Introduced'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-500">8+</p>
            <p className="text-xs text-gray-500">
              {t('redstone.erc7412.chainsSupported') || 'Chains Supported'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-500">100%</p>
            <p className="text-xs text-gray-500">
              {t('redstone.erc7412.chainlinkCompat') || 'Chainlink Compatible'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
