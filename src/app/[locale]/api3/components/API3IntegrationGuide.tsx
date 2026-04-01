'use client';

import { useState } from 'react';

import {
  Rocket,
  BookOpen,
  Settings,
  HelpCircle,
  ChevronRight,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Copy,
  Check,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

const getQuickStartSteps = () => [
  {
    step: 1,
    titleKey: 'api3.developer.guide.quickStart.step1.title',
    descriptionKey: 'api3.developer.guide.quickStart.step1.description',
    code: null,
    link: 'https://api3.org/developers',
    linkTextKey: 'api3.developer.guide.quickStart.getApiKey',
  },
  {
    step: 2,
    titleKey: 'api3.developer.guide.quickStart.step2.title',
    descriptionKey: 'api3.developer.guide.quickStart.step2.description',
    code: 'npm install @api3/contracts @api3/airnode-protocol',
    link: null,
    linkTextKey: null,
  },
  {
    step: 3,
    titleKey: 'api3.developer.guide.quickStart.step3.title',
    descriptionKey: 'api3.developer.guide.quickStart.step3.description',
    code: `const API3_SERVER_V1_ADDRESS = '0x...'; // 根据网络选择正确地址`,
    link: null,
    linkTextKey: null,
  },
  {
    step: 4,
    titleKey: 'api3.developer.guide.quickStart.step4.title',
    descriptionKey: 'api3.developer.guide.quickStart.step4.description',
    code: `const serverV1 = new Api3ServerV1(API3_SERVER_V1_ADDRESS, provider);
const value = await serverV1.readDataFeedValue(dapiId);`,
    link: null,
    linkTextKey: null,
  },
];

const getIntegrationScenarios = () => [
  {
    id: 'defi-lending',
    titleKey: 'api3.developer.guide.scenarios.defiLending.title',
    descriptionKey: 'api3.developer.guide.scenarios.defiLending.description',
    steps: [
      '选择适合的 dAPI 数据源（如 ETH/USD）',
      '部署借贷合约并集成 API3 ServerV1',
      '配置清算阈值和价格偏差容忍度',
      '实现价格更新监听和清算逻辑',
    ],
    codeExample: `// 借贷合约示例
contract LendingProtocol {
    Api3ServerV1 public api3Server;
    bytes32 public ethUsdDapiId;
    
    constructor(address _api3Server, bytes32 _dapiId) {
        api3Server = Api3ServerV1(_api3Server);
        ethUsdDapiId = _dapiId;
    }
    
    function getCollateralValue(uint256 collateralAmount) 
        public view returns (uint256) {
        (int224 value, ) = api3Server.readDataFeedValueWithTimestamp(ethUsdDapiId);
        return (uint224(value) * collateralAmount) / 1e18;
    }
}`,
  },
  {
    id: 'derivatives',
    titleKey: 'api3.developer.guide.scenarios.derivatives.title',
    descriptionKey: 'api3.developer.guide.scenarios.derivatives.description',
    steps: [
      '集成多个 dAPI 数据源',
      '实现价格聚合和验证逻辑',
      '配置价格更新触发条件',
      '实现结算和交割逻辑',
    ],
    codeExample: `// 衍生品合约示例
contract DerivativesProtocol {
    struct Position {
        bytes32 dapiId;
        int224 entryPrice;
        uint256 size;
    }
    
    function settlePosition(uint256 positionId) public {
        Position storage pos = positions[positionId];
        (int224 currentPrice, ) = api3Server.readDataFeedValueWithTimestamp(pos.dapiId);
        int256 pnl = (currentPrice - pos.entryPrice) * int256(pos.size);
        // 结算逻辑...
    }
}`,
  },
  {
    id: 'cross-chain',
    titleKey: 'api3.developer.guide.scenarios.crossChain.title',
    descriptionKey: 'api3.developer.guide.scenarios.crossChain.description',
    steps: [
      '选择目标部署链',
      '获取各链的 API3 合约地址',
      '部署跨链消息传递合约',
      '实现价格同步和验证逻辑',
    ],
    codeExample: `// 跨链价格同步示例
contract CrossChainPriceFeed {
    mapping(uint256 => address) public chainApi3Servers;
    
    function syncPrice(uint256 sourceChain, bytes32 dapiId) external {
        // 通过跨链桥接收价格数据
        // 验证数据签名
        // 更新本地价格状态
    }
}`,
  },
];

const getBestPractices = () => [
  {
    titleKey: 'api3.developer.guide.bestPractices.useLatestData.title',
    descriptionKey: 'api3.developer.guide.bestPractices.useLatestData.description',
    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
  },
  {
    titleKey: 'api3.developer.guide.bestPractices.fallback.title',
    descriptionKey: 'api3.developer.guide.bestPractices.fallback.description',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  },
  {
    titleKey: 'api3.developer.guide.bestPractices.monitorDeviation.title',
    descriptionKey: 'api3.developer.guide.bestPractices.monitorDeviation.description',
    icon: <Lightbulb className="w-5 h-5 text-blue-500" />,
  },
  {
    titleKey: 'api3.developer.guide.bestPractices.gasSettings.title',
    descriptionKey: 'api3.developer.guide.bestPractices.gasSettings.description',
    icon: <Settings className="w-5 h-5 text-purple-500" />,
  },
];

const getTroubleshooting = () => [
  {
    problemKey: 'api3.developer.guide.troubleshooting.readFailed.problem',
    solutionKey: 'api3.developer.guide.troubleshooting.readFailed.solution',
  },
  {
    problemKey: 'api3.developer.guide.troubleshooting.timestampExpired.problem',
    solutionKey: 'api3.developer.guide.troubleshooting.timestampExpired.solution',
  },
  {
    problemKey: 'api3.developer.guide.troubleshooting.gasEstimationFailed.problem',
    solutionKey: 'api3.developer.guide.troubleshooting.gasEstimationFailed.solution',
  },
  {
    problemKey: 'api3.developer.guide.troubleshooting.signatureFailed.problem',
    solutionKey: 'api3.developer.guide.troubleshooting.signatureFailed.solution',
  },
];

const getFaqItems = () => [
  {
    questionKey: 'api3.developer.guide.faq.q1.question',
    answerKey: 'api3.developer.guide.faq.q1.answer',
  },
  {
    questionKey: 'api3.developer.guide.faq.q2.question',
    answerKey: 'api3.developer.guide.faq.q2.answer',
  },
  {
    questionKey: 'api3.developer.guide.faq.q3.question',
    answerKey: 'api3.developer.guide.faq.q3.answer',
  },
  {
    questionKey: 'api3.developer.guide.faq.q4.question',
    answerKey: 'api3.developer.guide.faq.q4.answer',
  },
];

export function API3IntegrationGuide() {
  const t = useTranslations();
  const quickStartSteps = getQuickStartSteps();
  const integrationScenarios = getIntegrationScenarios();
  const bestPractices = getBestPractices();
  const troubleshooting = getTroubleshooting();
  const faqItems = getFaqItems();
  const [activeScenario, setActiveScenario] = useState<string>('defi-lending');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Rocket className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.guide.quickStart.title') || '快速开始'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('api3.developer.guide.quickStart.description') || '几分钟内完成 API3 集成'}
          </p>
        </div>

        <div className="space-y-4">
          {quickStartSteps.map((step, index) => (
            <div key={step.step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-sm font-medium text-emerald-600">
                  {step.step}
                </div>
                {index < quickStartSteps.length - 1 && (
                  <div className="w-0.5 h-full bg-emerald-100 mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <h3 className="text-sm font-medium text-gray-900">{t(step.titleKey)}</h3>
                <p className="text-sm text-gray-500 mt-1">{t(step.descriptionKey)}</p>
                {step.code && (
                  <div className="relative mt-2 bg-gray-900 rounded-lg p-3">
                    <button
                      onClick={() => handleCopy(step.code!, `step-${step.step}`)}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-700 transition-colors"
                    >
                      {copiedCode === `step-${step.step}` ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                    <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                      {step.code}
                    </pre>
                  </div>
                )}
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 mt-2"
                  >
                    {t(step.linkTextKey!)} <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.guide.scenarios.title') || '集成场景'}
          </h2>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {integrationScenarios.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setActiveScenario(scenario.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeScenario === scenario.id
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t(scenario.titleKey)}
            </button>
          ))}
        </div>

        {integrationScenarios.map(
          (scenario) =>
            activeScenario === scenario.id && (
              <div key={scenario.id} className="bg-white border border-gray-100 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">
                  {t(scenario.descriptionKey)}
                </h3>
                <div className="space-y-2 mb-4">
                  {scenario.steps.map((step, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <span className="text-sm text-gray-600">{step}</span>
                    </div>
                  ))}
                </div>
                <div className="relative bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <button
                    onClick={() => handleCopy(scenario.codeExample, `scenario-${scenario.id}`)}
                    className="absolute top-2 right-2 p-1 rounded hover:bg-gray-700 transition-colors"
                  >
                    {copiedCode === `scenario-${scenario.id}` ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
                    {scenario.codeExample}
                  </pre>
                </div>
              </div>
            )
        )}
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.guide.bestPractices.title') || '最佳实践'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bestPractices.map((practice, index) => (
            <div key={index} className="bg-white border border-gray-100 rounded-lg p-4">
              <div className="flex items-start gap-3">
                {practice.icon}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{t(practice.titleKey)}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t(practice.descriptionKey)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.guide.troubleshooting.title') || '故障排除'}
          </h2>
        </div>

        <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {t('api3.developer.guide.troubleshooting.problem') || '问题'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                  {t('api3.developer.guide.troubleshooting.solution') || '解决方案'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {troubleshooting.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t(item.problemKey)}</td>
                  <td className="px-4 py-3 text-gray-600">{t(item.solutionKey)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="border-t border-gray-200" />

      <section>
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            {t('api3.developer.guide.faq.title') || '常见问题'}
          </h2>
        </div>

        <div className="space-y-3">
          {faqItems.map((faq, index) => (
            <div key={index} className="bg-white border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">{t(faq.questionKey)}</span>
                <ChevronRight
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedFaq === index ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedFaq === index && (
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                  <p className="text-sm text-gray-600">{t(faq.answerKey)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
