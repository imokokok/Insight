'use client';

import { useState, useEffect } from 'react';

import {
  Send,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  X,
  Zap,
  Shield,
  Users,
  ArrowRight,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

interface FlowStage {
  id: string;
  title: string;
  titleCn: string;
  description: string;
  detailedDescription: string;
  duration: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed';
}

interface StageDetailModalProps {
  stage: FlowStage | null;
  onClose: () => void;
  themeColor: string;
  t: ReturnType<typeof useTranslations>;
}

function StageDetailModal({ stage, onClose, themeColor, t }: StageDetailModalProps) {
  if (!stage) return null;

  const getStageDetails = (stageId: string): { points: string[]; example?: string } => {
    switch (stageId) {
      case 'request':
        return {
          points: [
            t('uma.optimisticOracle.dataRequest.point1'),
            t('uma.optimisticOracle.dataRequest.point2'),
            t('uma.optimisticOracle.dataRequest.point3'),
            t('uma.optimisticOracle.dataRequest.point4'),
          ],
          example: t('uma.optimisticOracle.dataRequest.example'),
        };
      case 'validation':
        return {
          points: [
            t('uma.optimisticOracle.validation.point1'),
            t('uma.optimisticOracle.validation.point2'),
            t('uma.optimisticOracle.validation.point3'),
            t('uma.optimisticOracle.validation.point4'),
          ],
          example: t('uma.optimisticOracle.validation.example'),
        };
      case 'dispute':
        return {
          points: [
            t('uma.optimisticOracle.dispute.point1'),
            t('uma.optimisticOracle.dispute.point2'),
            t('uma.optimisticOracle.dispute.point3'),
            t('uma.optimisticOracle.dispute.point4'),
          ],
          example: t('uma.optimisticOracle.dispute.example'),
        };
      case 'confirmation':
        return {
          points: [
            t('uma.optimisticOracle.confirmation.point1'),
            t('uma.optimisticOracle.confirmation.point2'),
            t('uma.optimisticOracle.confirmation.point3'),
            t('uma.optimisticOracle.confirmation.point4'),
          ],
          example: t('uma.optimisticOracle.confirmation.example'),
        };
      default:
        return { points: [] };
    }
  };

  const stageDetail = getStageDetails(stage.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${themeColor}15` }}
              >
                <div style={{ color: themeColor }} className="w-6 h-6">
                  {stage.icon}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{stage.titleCn}</h3>
                <p className="text-sm text-gray-500">{stage.title}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {t('uma.optimisticOracle.dataRequest.duration')}:
            </span>
            <span className="text-sm font-semibold text-gray-900">{stage.duration}</span>
          </div>

          <p className="text-sm text-gray-700 mb-4">{stage.description}</p>

          <div className="space-y-2 mb-4">
            {stageDetail?.points.map((point, index) => (
              <div key={index} className="flex items-start gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: themeColor }}
                />
                <span className="text-sm text-gray-700">{point}</span>
              </div>
            ))}
          </div>

          {stageDetail?.example && (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-500 mb-1">{t('uma.education.usedByProjects')}</p>
              <p className="text-sm text-gray-700">{stageDetail.example}</p>
            </div>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-opacity"
            style={{ backgroundColor: themeColor }}
          >
            {t('uma.dataQuality.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowingDataAnimation({ themeColor }: { themeColor: string }) {
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition((prev) => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full opacity-60"
        style={{
          backgroundColor: themeColor,
          left: `${position}%`,
          boxShadow: `0 0 10px ${themeColor}`,
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full opacity-40"
        style={{
          backgroundColor: themeColor,
          left: `${(position + 20) % 100}%`,
        }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full opacity-30"
        style={{
          backgroundColor: themeColor,
          left: `${(position + 40) % 100}%`,
        }}
      />
    </div>
  );
}

function StageCard({
  stage,
  index,
  isActive,
  isCompleted,
  onClick,
  themeColor,
  t,
}: {
  stage: FlowStage;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  themeColor: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={cn(
          'w-full p-4 rounded-xl border-2 transition-all duration-300 text-left',
          isActive
            ? 'border-red-500 bg-red-50 shadow-lg shadow-red-100'
            : isCompleted
              ? 'border-gray-300 bg-gray-50'
              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all',
              isActive
                ? 'bg-red-500 text-white'
                : isCompleted
                  ? 'bg-gray-400 text-white'
                  : 'bg-gray-100 text-gray-600'
            )}
          >
            {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : stage.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-400">
                {t('uma.optimisticOracle.step')} {index + 1}
              </span>
              {isActive && (
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                >
                  {t('uma.optimisticOracle.inProgress')}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">{stage.titleCn}</h3>
            <p className="text-xs text-gray-600 mb-2 line-clamp-2">{stage.description}</p>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-500">{stage.duration}</span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </button>

      {isActive && (
        <div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-16 h-1 rounded-full"
          style={{ backgroundColor: themeColor }}
        />
      )}
    </div>
  );
}

function DesktopFlowView({
  stages,
  activeStage,
  onStageClick,
  themeColor,
  t,
}: {
  stages: FlowStage[];
  activeStage: number;
  onStageClick: (index: number) => void;
  themeColor: string;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="relative">
      <FlowingDataAnimation themeColor={themeColor} />

      <div className="flex items-center justify-between gap-4">
        {stages.map((stage, index) => {
          const isActive = index === activeStage;
          const isCompleted = index < activeStage;

          return (
            <div key={stage.id} className="flex items-center flex-1">
              <button
                onClick={() => onStageClick(index)}
                className={cn(
                  'flex-1 p-5 rounded-xl border-2 transition-all duration-300',
                  isActive
                    ? 'border-red-500 bg-red-50 shadow-lg shadow-red-100 scale-105'
                    : isCompleted
                      ? 'border-gray-300 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-all',
                      isActive
                        ? 'bg-red-500 text-white'
                        : isCompleted
                          ? 'bg-gray-400 text-white'
                          : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-7 h-7" /> : stage.icon}
                  </div>

                  <span className="text-xs text-gray-400 mb-1">
                    {t('uma.optimisticOracle.step')} {index + 1}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mb-2">{stage.titleCn}</h3>
                  <p className="text-xs text-gray-600 mb-3 line-clamp-2">{stage.description}</p>

                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
                      isActive ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{stage.duration}</span>
                  </div>

                  {isActive && (
                    <div className="mt-3 flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span
                          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                          style={{ backgroundColor: themeColor }}
                        />
                        <span
                          className="relative inline-flex rounded-full h-2 w-2"
                          style={{ backgroundColor: themeColor }}
                        />
                      </span>
                      <span className="text-xs font-medium" style={{ color: themeColor }}>
                        {t('uma.optimisticOracle.currentStage')}
                      </span>
                    </div>
                  )}
                </div>
              </button>

              {index < stages.length - 1 && (
                <div className="mx-2 flex-shrink-0">
                  <ArrowRight
                    className={cn(
                      'w-5 h-5 transition-colors',
                      isCompleted ? 'text-gray-400' : 'text-gray-300'
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OptimisticOracleFlow() {
  const t = useTranslations();
  const [activeStage, setActiveStage] = useState(1);
  const [selectedStage, setSelectedStage] = useState<FlowStage | null>(null);
  const themeColor = '#dc2626';

  const stages: FlowStage[] = [
    {
      id: 'request',
      title: t('uma.optimisticOracle.dataRequest.title'),
      titleCn: t('uma.optimisticOracle.dataRequest.title'),
      description: t('uma.optimisticOracle.dataRequest.description'),
      detailedDescription: t('uma.optimisticOracle.dataRequest.description'),
      duration: t('uma.optimisticOracle.dataRequest.duration'),
      icon: <Send className="w-5 h-5" />,
      status: activeStage === 0 ? 'active' : activeStage > 0 ? 'completed' : 'pending',
    },
    {
      id: 'validation',
      title: t('uma.optimisticOracle.validation.title'),
      titleCn: t('uma.optimisticOracle.validation.title'),
      description: t('uma.optimisticOracle.validation.description'),
      detailedDescription: t('uma.optimisticOracle.validation.description'),
      duration: t('uma.optimisticOracle.validation.duration'),
      icon: <Clock className="w-5 h-5" />,
      status: activeStage === 1 ? 'active' : activeStage > 1 ? 'completed' : 'pending',
    },
    {
      id: 'dispute',
      title: t('uma.optimisticOracle.dispute.title'),
      titleCn: t('uma.optimisticOracle.dispute.title'),
      description: t('uma.optimisticOracle.dispute.description'),
      detailedDescription: t('uma.optimisticOracle.dispute.description'),
      duration: t('uma.optimisticOracle.dispute.duration'),
      icon: <AlertTriangle className="w-5 h-5" />,
      status: activeStage === 2 ? 'active' : activeStage > 2 ? 'completed' : 'pending',
    },
    {
      id: 'confirmation',
      title: t('uma.optimisticOracle.confirmation.title'),
      titleCn: t('uma.optimisticOracle.confirmation.title'),
      description: t('uma.optimisticOracle.confirmation.description'),
      detailedDescription: t('uma.optimisticOracle.confirmation.description'),
      duration: t('uma.optimisticOracle.confirmation.duration'),
      icon: <CheckCircle2 className="w-5 h-5" />,
      status: activeStage === 3 ? 'active' : 'completed',
    },
  ];

  const handleStageClick = (index: number) => {
    setSelectedStage(stages[index]);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Zap className="w-5 h-5" style={{ color: themeColor }} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{t('uma.optimisticOracle.title')}</h2>
              <p className="text-sm text-gray-500">{t('uma.optimisticOracle.subtitle')}</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">{t('uma.optimisticOracle.description')}</p>
      </div>

      <div className="p-6">
        <div className="hidden lg:block">
          <DesktopFlowView
            stages={stages}
            activeStage={activeStage}
            onStageClick={handleStageClick}
            themeColor={themeColor}
            t={t}
          />
        </div>

        <div className="lg:hidden space-y-3">
          {stages.map((stage, index) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={index}
              isActive={index === activeStage}
              isCompleted={index < activeStage}
              onClick={() => handleStageClick(index)}
              themeColor={themeColor}
              t={t}
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span>{t('uma.optimisticOracle.completed')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
            <span>{t('uma.optimisticOracle.inProgress')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <span>{t('uma.optimisticOracle.pending')}</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('uma.optimisticOracle.coreAdvantages')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Zap className="w-4 h-4" style={{ color: themeColor }} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.optimisticOracle.fastEfficient')}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {t('uma.optimisticOracle.fastEfficientDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Shield className="w-4 h-4" style={{ color: themeColor }} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.optimisticOracle.secureReliable')}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {t('uma.optimisticOracle.secureReliableDesc')}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Users className="w-4 h-4" style={{ color: themeColor }} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                {t('uma.optimisticOracle.decentralizedOpen')}
              </h4>
              <p className="text-xs text-gray-600 mt-1">
                {t('uma.optimisticOracle.decentralizedOpenDesc')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {t('uma.optimisticOracle.simulateProgress')}:
              </span>
              <div className="flex gap-1">
                {stages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStage(index)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-medium transition-all',
                      activeStage === index
                        ? 'text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                    style={activeStage === index ? { backgroundColor: themeColor } : {}}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setActiveStage((prev) => (prev + 1) % 4)}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
            >
              {t('uma.optimisticOracle.nextStep')} →
            </button>
          </div>
        </div>
      )}

      <StageDetailModal
        stage={selectedStage}
        onClose={() => setSelectedStage(null)}
        themeColor={themeColor}
        t={t}
      />
    </div>
  );
}

export default OptimisticOracleFlow;
