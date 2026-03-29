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
  Loader2,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
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

function UseCaseCard({ useCase, index, t }: { useCase: UseCase; index: number; t: ReturnType<typeof useTranslations> }) {
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
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{t('uma.ecosystem.features')}</p>
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

function BestPracticeCard({ practice, t }: { practice: BestPractice; t: ReturnType<typeof useTranslations> }) {
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
            {t('uma.education.disputeParticipantGuide')}
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
            {t('uma.education.riskManagementAdvice')}
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

export function EducationContent({ isLoading = false }: { isLoading?: boolean }) {
  const t = useTranslations();
  const [activeSection, setActiveSection] = useState<'intro' | 'cases' | 'faq' | 'practices'>('intro');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'intro' as const, label: t('uma.education.intro'), icon: <BookOpen className="w-4 h-4" /> },
    { id: 'cases' as const, label: t('uma.education.cases'), icon: <Zap className="w-4 h-4" /> },
    { id: 'faq' as const, label: t('uma.education.faq'), icon: <Users className="w-4 h-4" /> },
    { id: 'practices' as const, label: t('uma.education.practices'), icon: <Award className="w-4 h-4" /> },
  ];

  const faqItems: AccordionItem[] = [
    {
      question: t('uma.education.whatIsOptimisticOracle'),
      answer: t('uma.education.whatIsOptimisticOracleAnswer'),
    },
    {
      question: t('uma.education.howToParticipate'),
      answer: t('uma.education.howToParticipateAnswer'),
    },
    {
      question: t('uma.education.howDisputesResolved'),
      answer: t('uma.education.howDisputesResolvedAnswer'),
    },
    {
      question: t('uma.education.howToEarnStaking'),
      answer: t('uma.education.howToEarnStakingAnswer'),
    },
    {
      question: t('uma.education.umaVsOthers'),
      answer: t('uma.education.umaVsOthersAnswer'),
    },
    {
      question: t('uma.education.securityGuarantee'),
      answer: t('uma.education.securityGuaranteeAnswer'),
    },
  ];

  const useCases: UseCase[] = [
    {
      icon: <Link2 className="w-5 h-5" />,
      title: t('uma.ecosystem.useCases.bridge.title'),
      description: t('uma.ecosystem.protocols.across'),
      project: 'Across Protocol',
      tvl: '$450M+',
      features: t('uma.ecosystem.examples.bridge') as unknown as string[],
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: t('uma.ecosystem.useCases.prediction.title'),
      description: t('uma.ecosystem.protocols.polymarket'),
      project: 'Polymarket',
      tvl: '$120M+',
      features: t('uma.ecosystem.examples.prediction') as unknown as string[],
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: t('uma.ecosystem.useCases.treasury.title'),
      description: t('uma.ecosystem.protocols.outcome'),
      project: 'Outcome.Finance',
      tvl: '$85M+',
      features: t('uma.ecosystem.examples.treasury') as unknown as string[],
    },
    {
      icon: <Umbrella className="w-5 h-5" />,
      title: t('uma.ecosystem.useCases.insurance.title'),
      description: t('uma.ecosystem.protocols.sherlock'),
      project: 'Sherlock',
      tvl: '$45M+',
      features: t('uma.ecosystem.examples.insurance') as unknown as string[],
    },
  ];

  const bestPractices: BestPractice[] = [
    {
      icon: <Shield className="w-5 h-5" />,
      title: t('uma.education.validatorBestPractices'),
      description: t('uma.education.validatorBestPracticesDesc'),
      steps: [
        t('uma.education.establishDataSource'),
        t('uma.education.setupAutoResponse'),
        t('uma.education.maintainStakeBalance'),
        t('uma.education.reviewHistoricalCases'),
      ],
      tips: [
        t('uma.education.prioritizeHighValue'),
        t('uma.education.crossValidateSources'),
        t('uma.education.monitorCommunityDiscussion'),
      ],
    },
    {
      icon: <Gavel className="w-5 h-5" />,
      title: t('uma.education.disputeParticipantGuide'),
      description: t('uma.education.disputeParticipantGuideDesc'),
      steps: [
        t('uma.education.researchDataSources'),
        t('uma.education.analyzeHistoricalCases'),
        t('uma.education.assessChallengerReputation'),
        t('uma.education.voteWithinWindow'),
      ],
      tips: [
        t('uma.education.dontFollowBlindly'),
        t('uma.education.watchUmaForum'),
        t('uma.education.allocateVotingWeight'),
      ],
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: t('uma.education.riskManagementAdvice'),
      description: t('uma.education.riskManagementAdviceDesc'),
      steps: [
        t('uma.education.diversifyStaking'),
        t('uma.education.setStopLoss'),
        t('uma.education.checkContractStatus'),
        t('uma.education.followProtocolUpdates'),
      ],
      tips: [
        t('uma.education.dontStakeAllInOne'),
        t('uma.education.understandContractRisk'),
        t('uma.education.establishEmergencyPlan'),
      ],
    },
    {
      icon: <Award className="w-5 h-5" />,
      title: t('uma.education.yieldOptimizationStrategy'),
      description: t('uma.education.yieldOptimizationStrategyDesc'),
      steps: [
        t('uma.education.chooseHighParticipationPools'),
        t('uma.education.participateAllVoting'),
        t('uma.education.leverageCompoundEffect'),
        t('uma.education.followInflationRewards'),
      ],
      tips: [
        t('uma.education.highVotingParticipationReward'),
        t('uma.education.longTermStakingHigher'),
        t('uma.education.governanceParticipationReward'),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('uma.education.title')}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t('uma.education.subtitle')}</p>
        </div>
        <a
          href="https://docs.umaproject.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
        >
          <span>{t('uma.education.officialDocs')}</span>
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
                <h3 className="text-sm font-semibold text-gray-900">{t('uma.education.whatIsUma')}</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('uma.education.whatIsUmaDesc')}
              </p>
            </div>

            <div className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{t('uma.education.coreValueProposition')}</h3>
              </div>
              <ul className="space-y-2">
                {[
                  t('uma.education.lowCostVerification'),
                  t('uma.education.highFlexibility'),
                  t('uma.education.highSecurity'),
                  t('uma.education.decentralized'),
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
              <h3 className="text-sm font-semibold text-gray-900">{t('uma.education.techArchitecture')}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">{t('uma.education.optimisticOracleLayer')}</h4>
                <p className="text-xs text-gray-500">
                  {t('uma.education.optimisticOracleLayerDesc')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">{t('uma.education.governanceLayer')}</h4>
                <p className="text-xs text-gray-500">
                  {t('uma.education.governanceLayerDesc')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-semibold text-gray-700 mb-2">{t('uma.education.applicationLayer')}</h4>
                <p className="text-xs text-gray-500">
                  {t('uma.education.applicationLayerDesc')}
                </p>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{t('uma.education.comparisonWithOthers')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">{t('uma.education.feature')}</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">UMA</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Chainlink</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Band Protocol</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [t('uma.education.verificationMode'), t('uma.education.optimisticVerification'), t('uma.education.activeVerification'), t('uma.education.activeVerification')],
                    [t('uma.education.dataType'), t('uma.education.anyType'), t('uma.education.mainlyPrice'), t('uma.education.mainlyPrice')],
                    [t('uma.education.verificationCost'), t('uma.education.veryLow'), t('uma.education.medium'), t('uma.education.medium')],
                    [t('uma.education.disputeMechanism'), t('uma.education.builtIn'), t('uma.education.none'), t('uma.education.limited')],
                    [t('uma.education.participationThreshold'), t('uma.education.lowThreshold'), t('uma.education.highThreshold'), t('uma.education.medium')],
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
              {t('uma.education.usedByProjects')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {useCases.map((useCase, index) => (
              <UseCaseCard key={index} useCase={useCase} index={index} t={t} />
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{t('uma.education.wantToIntegrate')}</h4>
                <p className="text-xs text-gray-600">
                  {t('uma.education.integrationDesc')}
                </p>
                <a
                  href="https://docs.umaproject.org/developers"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-red-600 hover:text-red-700"
                >
                  <span>{t('uma.education.viewDevDocs')}</span>
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
              <h3 className="text-sm font-semibold text-gray-900">{t('uma.education.faqTitle')}</h3>
              <p className="text-xs text-gray-500">{t('uma.education.faqSubtitle')}</p>
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
              <h3 className="text-sm font-semibold text-gray-900">{t('uma.education.bestPracticesTitle')}</h3>
              <p className="text-xs text-gray-500">{t('uma.education.bestPracticesSubtitle')}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bestPractices.map((practice, index) => (
              <BestPracticeCard key={index} practice={practice} t={t} />
            ))}
          </div>

          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{t('uma.education.continuousLearning')}</h4>
                <p className="text-xs text-gray-600">
                  {t('uma.education.continuousLearningDesc')}
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
