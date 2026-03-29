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
}

function StageDetailModal({ stage, onClose, themeColor }: StageDetailModalProps) {
  if (!stage) return null;

  const details: Record<string, { points: string[]; example?: string }> = {
    request: {
      points: [
        '用户或智能合约发起数据请求',
        '指定所需数据类型和验证要求',
        '提供请求奖励（激励验证者响应）',
        '设定验证期和争议窗口时长',
      ],
      example: '例如：请求"BTC/USD在2024年1月1日的价格"',
    },
    validation: {
      points: [
        '验证者检查数据请求',
        '提交初始答案和质押保证金',
        '系统进入验证等待期',
        '其他验证者可提交替代答案',
      ],
      example: '验证者提交答案：$42,500',
    },
    dispute: {
      points: [
        '争议窗口开启，任何人可质疑答案',
        '质疑者需质押保证金发起争议',
        '争议进入UMA投票系统',
        'UMA代币持有者投票决定正确答案',
      ],
      example: '若有人认为答案错误，可发起争议',
    },
    confirmation: {
      points: [
        '验证期结束且无争议，答案确认',
        '或争议解决后，最终答案确定',
        '答案写入智能合约',
        '奖励分配给正确方',
      ],
      example: '最终确认：$42,500（无争议）',
    },
  };

  const stageDetail = details[stage.id];

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
            <span className="text-sm text-gray-600">持续时间：</span>
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
              <p className="text-xs text-gray-500 mb-1">示例</p>
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
            关闭
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
}: {
  stage: FlowStage;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
  themeColor: string;
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
              <span className="text-xs font-medium text-gray-400">步骤 {index + 1}</span>
              {isActive && (
                <span
                  className="px-2 py-0.5 text-xs font-medium rounded-full"
                  style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
                >
                  进行中
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
}: {
  stages: FlowStage[];
  activeStage: number;
  onStageClick: (index: number) => void;
  themeColor: string;
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

                  <span className="text-xs text-gray-400 mb-1">步骤 {index + 1}</span>
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
                        当前阶段
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
  const [activeStage, setActiveStage] = useState(1);
  const [selectedStage, setSelectedStage] = useState<FlowStage | null>(null);
  const themeColor = '#dc2626';

  const stages: FlowStage[] = [
    {
      id: 'request',
      title: 'Data Request',
      titleCn: '数据请求',
      description: '用户发起数据请求，指定所需数据和奖励',
      detailedDescription:
        '用户或智能合约向乐观预言机提交数据请求，包括数据类型、验证要求和激励奖励。',
      duration: '即时',
      icon: <Send className="w-5 h-5" />,
      status: activeStage === 0 ? 'active' : activeStage > 0 ? 'completed' : 'pending',
    },
    {
      id: 'validation',
      title: 'Validation Period',
      titleCn: '验证期',
      description: '验证者提交答案，进入等待验证阶段',
      detailedDescription: '验证者检查请求并提交答案，同时质押保证金作为诚实保证。',
      duration: '2小时',
      icon: <Clock className="w-5 h-5" />,
      status: activeStage === 1 ? 'active' : activeStage > 1 ? 'completed' : 'pending',
    },
    {
      id: 'dispute',
      title: 'Dispute Window',
      titleCn: '争议窗口',
      description: '任何人可质疑答案并发起争议',
      detailedDescription: '在争议窗口期内，任何参与者都可以质疑提交的答案并提供替代答案。',
      duration: '24小时',
      icon: <AlertTriangle className="w-5 h-5" />,
      status: activeStage === 2 ? 'active' : activeStage > 2 ? 'completed' : 'pending',
    },
    {
      id: 'confirmation',
      title: 'Final Confirmation',
      titleCn: '最终确认',
      description: '答案确认并写入智能合约',
      detailedDescription: '验证期结束且无争议，或争议解决后，最终答案被确认并写入链上。',
      duration: '即时',
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
              <h2 className="text-lg font-bold text-gray-900">乐观预言机工作流程</h2>
              <p className="text-sm text-gray-500">Optimistic Oracle Workflow</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-3">
          UMA的乐观预言机采用&ldquo;乐观验证&rdquo;机制，默认信任验证者提交的答案，仅在出现争议时才进行投票裁决，大幅提升了效率和降低了成本。
        </p>
      </div>

      <div className="p-6">
        <div className="hidden lg:block">
          <DesktopFlowView
            stages={stages}
            activeStage={activeStage}
            onStageClick={handleStageClick}
            themeColor={themeColor}
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
            />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span>已完成</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: themeColor }} />
            <span>进行中</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-200" />
            <span>待处理</span>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">核心优势</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <Zap className="w-4 h-4" style={{ color: themeColor }} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">高效快速</h4>
              <p className="text-xs text-gray-600 mt-1">
                无争议情况下，2小时即可完成验证，远快于传统预言机
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
              <h4 className="text-sm font-medium text-gray-900">安全可靠</h4>
              <p className="text-xs text-gray-600 mt-1">
                经济激励机制确保验证者诚实，争议机制保障数据准确性
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
              <h4 className="text-sm font-medium text-gray-900">去中心化</h4>
              <p className="text-xs text-gray-600 mt-1">
                任何人都可以成为验证者，UMA持有者参与争议投票
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">模拟进度控制：</span>
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
            下一步 →
          </button>
        </div>
      </div>

      <StageDetailModal
        stage={selectedStage}
        onClose={() => setSelectedStage(null)}
        themeColor={themeColor}
      />
    </div>
  );
}

export default OptimisticOracleFlow;
