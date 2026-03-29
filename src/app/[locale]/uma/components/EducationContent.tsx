'use client';

import { useState } from 'react';

import {
  BookOpen,
  Zap,
  Shield,
  Users,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Link2,
  Target,
  TrendingUp,
  Umbrella,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Award,
  Clock,
  Wallet,
  Gavel,
  ArrowRight,
} from 'lucide-react';

import { cn } from '@/lib/utils';

interface AccordionItem {
  question: string;
  answer: string;
}

interface UseCase {
  icon: React.ReactNode;
  title: string;
  description: string;
  project: string;
  tvl: string;
  features: string[];
}

interface BestPractice {
  icon: React.ReactNode;
  title: string;
  description: string;
  steps: string[];
  tips: string[];
}

function Accordion({ items }: { items: AccordionItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={index}
          className="border border-gray-200 rounded-lg overflow-hidden"
        >
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900">{item.question}</span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-gray-400 transition-transform duration-200',
                openIndex === index && 'rotate-180'
              )}
            />
          </button>
          {openIndex === index && (
            <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
              <div className="pt-3">{item.answer}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function UseCaseCard({ useCase, index }: { useCase: UseCase; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'border border-gray-200 rounded-xl overflow-hidden transition-all duration-300',
        isExpanded && 'shadow-md'
      )}
    >
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-50 to-red-100 border border-red-100 flex items-center justify-center flex-shrink-0">
            <div className="text-red-600">{useCase.icon}</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-gray-900">{useCase.title}</h4>
              <span className="text-xs text-gray-400">{useCase.project}</span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{useCase.description}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-medium text-gray-700">TVL: {useCase.tvl}</span>
              <ChevronRight
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform duration-200',
                  isExpanded && 'rotate-90'
                )}
              />
            </div>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-100 bg-gray-50/50">
          <div className="pt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">核心功能</p>
            <div className="flex flex-wrap gap-2">
              {useCase.features.map((feature, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BestPracticeCard({ practice }: { practice: BestPractice }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-100 flex items-center justify-center flex-shrink-0">
          <div className="text-amber-600">{practice.icon}</div>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{practice.title}</h4>
          <p className="text-xs text-gray-500 mt-0.5">{practice.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            操作步骤
          </p>
          <ol className="space-y-1.5">
            {practice.steps.map((step, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-[10px] font-medium text-gray-500">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            专业建议
          </p>
          <ul className="space-y-1">
            {practice.tips.map((tip, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-amber-500 mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const faqItems: AccordionItem[] = [
  {
    question: '什么是乐观预言机（Optimistic Oracle）？',
    answer:
      '乐观预言机是UMA的核心创新机制。与传统预言机不同，它采用"乐观验证"模式：默认信任验证者提交的答案，只有在有人提出争议时才启动投票裁决。这种机制大幅降低了链上验证成本，同时保持了高度的安全性。验证者需要质押UMA代币作为担保，如果提交错误答案将面临罚没风险。',
  },
  {
    question: '如何参与UMA验证？',
    answer:
      '参与UMA验证需要以下步骤：1) 获取UMA代币并质押到系统；2) 监控数据请求并在规定时间内提交答案；3) 确保答案准确且有可靠数据源支持；4) 参与争议投票以获得额外奖励。验证者需要保持在线状态并及时响应请求，同时需要了解争议解决机制以保护自己的质押资产。',
  },
  {
    question: '争议如何解决？',
    answer:
      '当有人对验证者提交的答案提出争议时，UMA会启动争议解决流程：1) 争议发起者需要质押UMA代币；2) 进入投票阶段，UMA代币持有者可以投票支持或反对争议；3) 投票结束后，根据多数票决定结果；4) 败诉方的质押将被罚没并分配给胜诉方。整个过程通常在48小时内完成，确保了快速且公正的争议解决。',
  },
  {
    question: '如何质押获得收益？',
    answer:
      'UMA质押收益主要来自三个方面：1) 验证奖励 - 成功验证数据请求可获得手续费分成；2) 争议投票奖励 - 参与投票可获得投票奖励；3) 通胀奖励 - UMA协议会发放通胀奖励给活跃参与者。要获得最佳收益，建议保持高参与率、及时响应请求、积极参与治理投票，并确保质押金额与风险承受能力相匹配。',
  },
  {
    question: 'UMA与其他预言机有什么区别？',
    answer:
      'UMA与传统预言机的主要区别：1) 验证机制 - UMA采用乐观验证，默认信任验证者，而Chainlink等采用主动验证；2) 数据类型 - UMA支持任意数据类型验证，不仅限于价格数据；3) 成本效率 - 由于乐观机制，UMA的验证成本更低；4) 灵活性 - 开发者可以定义自己的验证逻辑和数据源；5) 去中心化程度 - 任何人都可以参与验证和争议。',
  },
  {
    question: 'UMA的安全性如何保障？',
    answer:
      'UMA通过多层机制保障安全：1) 经济激励 - 验证者质押代币作为担保，错误行为将导致罚没；2) 争议机制 - 任何人都可发起争议，确保答案准确性；3) 社区治理 - UMA持有者参与治理决策，确保协议健康发展；4) 多重签名 - 关键操作需要多方确认；5) 审计保障 - 智能合约经过多次安全审计。',
  },
];

const useCases: UseCase[] = [
  {
    icon: <Link2 className="w-5 h-5" />,
    title: '跨链桥验证',
    description: 'UMA为Across Protocol提供跨链交易验证服务，确保资产在不同区块链间安全转移。',
    project: 'Across Protocol',
    tvl: '$450M+',
    features: ['即时跨链', '低成本验证', '争议保护', '多链支持'],
  },
  {
    icon: <Target className="w-5 h-5" />,
    title: '预测市场',
    description: 'Polymarket使用UMA验证事件结果，实现去中心化的预测市场结算。',
    project: 'Polymarket',
    tvl: '$120M+',
    features: ['事件验证', '自动结算', '透明可信', '低手续费'],
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: '衍生品协议',
    description: 'Outcome.Finance利用UMA创建和结算各种金融衍生品合约。',
    project: 'Outcome.Finance',
    tvl: '$85M+',
    features: ['合约创建', '价格验证', '自动结算', '自定义条件'],
  },
  {
    icon: <Umbrella className="w-5 h-5" />,
    title: '保险协议',
    description: 'Sherlock使用UMA验证保险理赔事件，实现去中心化保险服务。',
    project: 'Sherlock',
    tvl: '$45M+',
    features: ['理赔验证', '自动赔付', '透明流程', '社区审核'],
  },
];

const bestPractices: BestPractice[] = [
  {
    icon: <Shield className="w-5 h-5" />,
    title: '验证者最佳实践',
    description: '提高验证效率和收益的关键策略',
    steps: [
      '建立可靠的数据源监控体系',
      '设置自动化响应系统',
      '保持充足的质押余额',
      '定期审查历史争议案例',
    ],
    tips: [
      '优先处理高价值请求以获得更多奖励',
      '建立多数据源交叉验证机制',
      '关注社区讨论了解潜在争议',
    ],
  },
  {
    icon: <Gavel className="w-5 h-5" />,
    title: '争议参与者指南',
    description: '有效参与争议处理的策略',
    steps: [
      '深入研究争议相关数据源',
      '分析历史类似案例的处理结果',
      '评估争议发起者的信誉',
      '在投票窗口内及时参与投票',
    ],
    tips: [
      '不要盲目跟随多数票，独立判断更重要',
      '关注UMA论坛的争议讨论',
      '合理分配投票权重',
    ],
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: '风险管理建议',
    description: '保护资产安全的关键措施',
    steps: [
      '分散质押到多个验证节点',
      '设置合理的止损策略',
      '定期检查智能合约状态',
      '保持对协议更新的关注',
    ],
    tips: [
      '不要将全部资产质押在单一协议',
      '了解智能合约风险和保险选项',
      '建立应急响应预案',
    ],
  },
  {
    icon: <Award className="w-5 h-5" />,
    title: '收益优化策略',
    description: '最大化质押收益的方法',
    steps: [
      '选择高参与率的验证池',
      '积极参与所有投票机会',
      '利用复利效应增加质押',
      '关注通胀奖励分配机制',
    ],
    tips: [
      '保持高投票参与率可获得额外奖励',
      '长期质押通常比短期质押收益更高',
      '参与治理可获得额外治理奖励',
    ],
  },
];

export function EducationContent() {
  const [activeSection, setActiveSection] = useState<'intro' | 'cases' | 'faq' | 'practices'>('intro');

  const sections = [
    { id: 'intro' as const, label: '协议介绍', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'cases' as const, label: '使用案例', icon: <Zap className="w-4 h-4" /> },
    { id: 'faq' as const, label: '常见问题', icon: <Users className="w-4 h-4" /> },
    { id: 'practices' as const, label: '最佳实践', icon: <Award className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">UMA 教育中心</h2>
          <p className="text-sm text-gray-500 mt-0.5">深入了解UMA协议机制与最佳实践</p>
        </div>
        <a
          href="https://docs.umaproject.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <span>官方文档</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all',
              activeSection === section.id
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {section.icon}
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {activeSection === 'intro' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-red-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">什么是UMA</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                UMA（Universal Market Access）是一个去中心化的预言机协议，专注于验证任何类型的数据。
                通过创新的乐观预言机机制，UMA能够以极低的成本验证价格、事件结果、保险理赔等多种数据类型，
                为DeFi生态系统提供灵活可靠的数据验证服务。
              </p>
            </div>

            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">核心价值主张</h3>
              </div>
              <ul className="space-y-2">
                {[
                  '低成本验证 - 乐观机制大幅降低链上验证成本',
                  '灵活性强 - 支持任意数据类型验证',
                  '高度安全 - 经济激励确保验证者诚实',
                  '去中心化 - 任何人可参与验证和争议',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">技术架构概览</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">乐观预言机层</h4>
                <p className="text-xs text-gray-500">
                  核心验证引擎，处理数据请求、验证提交和争议管理。
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">治理层</h4>
                <p className="text-xs text-gray-500">
                  UMA代币持有者参与协议治理，决定关键参数和升级。
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">应用层</h4>
                <p className="text-xs text-gray-500">
                  集成UMA的各种DeFi应用，如跨链桥、预测市场等。
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">与其他预言机的区别</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">特性</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">UMA</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Chainlink</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Band Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['验证模式', '乐观验证', '主动验证', '主动验证'],
                    ['数据类型', '任意类型', '主要是价格', '主要是价格'],
                    ['验证成本', '极低', '中等', '中等'],
                    ['争议机制', '内置', '无', '有限'],
                    ['参与门槛', '低', '高', '中等'],
                  ].map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 last:border-0">
                      {row.map((cell, cellIdx) => (
                        <td
                          key={cellIdx}
                          className={cn(
                            'py-2 px-3',
                            cellIdx === 0 ? 'font-medium text-gray-600' : 'text-gray-500'
                          )}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'cases' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-500">
              UMA已被多个主流DeFi项目采用，以下是典型使用案例
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {useCases.map((useCase, index) => (
              <UseCaseCard key={index} useCase={useCase} index={index} />
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">想要集成UMA？</h4>
                <p className="text-xs text-gray-600">
                  UMA提供完善的开发文档和SDK，帮助您快速集成乐观预言机服务。
                  无论是构建跨链应用、预测市场还是保险协议，UMA都能提供可靠的数据验证支持。
                </p>
                <a
                  href="https://docs.umaproject.org/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <span>查看开发文档</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'faq' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">常见问题解答</h3>
              <p className="text-xs text-gray-500">关于UMA协议的常见疑问</p>
            </div>
          </div>
          <Accordion items={faqItems} />
        </div>
      )}

      {activeSection === 'practices' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Award className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">最佳实践指南</h3>
              <p className="text-xs text-gray-500">成为优秀UMA参与者的关键建议</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestPractices.map((practice, index) => (
              <BestPracticeCard key={index} practice={practice} />
            ))}
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">持续学习</h4>
                <p className="text-xs text-gray-600">
                  UMA生态系统持续发展，建议定期关注官方公告、社区讨论和协议更新，
                  以保持对最新机制和最佳实践的了解。加入UMA Discord社区可以与其他参与者交流经验。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EducationContent;
