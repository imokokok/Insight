'use client';

import { useState, useEffect, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Server,
  Link2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Activity,
} from 'lucide-react';

import { chartColors, semanticColors } from '@/lib/config/colors';

export interface DataSourceInfo {
  id: string;
  name: string;
  type: 'exchange' | 'api' | 'aggregator';
  reliability: number;
  latency: number;
  status: 'active' | 'inactive' | 'degraded';
  lastUpdate: Date;
}

export interface DapiDataFlowVisualizationProps {
  dapiName: string;
  sources: DataSourceInfo[];
  targetChain: string;
}

interface FlowStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'active' | 'processing' | 'waiting';
  latency?: number;
}

const flowSteps: FlowStep[] = [
  { id: 'sources', label: '数据源', icon: <Database className="w-4 h-4" />, status: 'active' },
  { id: 'airnode', label: 'Airnode', icon: <Server className="w-4 h-4" />, status: 'waiting' },
  { id: 'aggregation', label: '聚合', icon: <Activity className="w-4 h-4" />, status: 'waiting' },
  { id: 'beacon', label: 'Beacon', icon: <Zap className="w-4 h-4" />, status: 'waiting' },
  { id: 'chain', label: '链上', icon: <Link2 className="w-4 h-4" />, status: 'waiting' },
];

function DataFlowParticle({ delay }: { delay: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-emerald-500"
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1, 0.5],
        x: [0, 200, 400, 600],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
}

function SourceNode({
  source,
  index,
  isActive,
}: {
  source: DataSourceInfo;
  index: number;
  isActive: boolean;
}) {
  const statusColor =
    source.status === 'active'
      ? semanticColors.success.DEFAULT
      : source.status === 'degraded'
        ? semanticColors.warning.DEFAULT
        : semanticColors.danger.DEFAULT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative p-3 rounded-lg border transition-all duration-300 ${
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ backgroundColor: statusColor }}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">{source.name}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{source.type}</span>
        <span>{source.latency}ms</span>
      </div>
      <div className="mt-2 h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-emerald-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${source.reliability}%` }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{source.reliability}% 可靠性</p>
    </motion.div>
  );
}

function FlowStepNode({
  step,
  isActive,
  isProcessing,
  latency,
}: {
  step: FlowStep;
  isActive: boolean;
  isProcessing: boolean;
  latency?: number;
}) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
          isActive
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
        }`}
        animate={isProcessing ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: isProcessing ? Infinity : 0 }}
      >
        {step.icon}
      </motion.div>
      <p
        className={`mt-2 text-xs font-medium ${
          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {step.label}
      </p>
      {latency !== undefined && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{latency}ms</p>
      )}
    </div>
  );
}

function FlowConnector({ isActive, hasParticle }: { isActive: boolean; hasParticle: boolean }) {
  return (
    <div className="relative flex-1 h-0.5 mx-2">
      <div
        className={`absolute inset-0 rounded-full transition-colors duration-300 ${
          isActive ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
        }`}
      />
      {hasParticle && (
        <motion.div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"
          animate={{
            x: [0, 100],
            opacity: [1, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{ left: '0%' }}
        />
      )}
    </div>
  );
}

export function DapiDataFlowVisualization({
  dapiName,
  sources,
  targetChain,
}: DapiDataFlowVisualizationProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [isFlowing, setIsFlowing] = useState(true);
  const [currentLatencies, setCurrentLatencies] = useState<number[]>([]);

  const simulateDataFlow = useCallback(() => {
    if (!isFlowing) return;

    const totalSteps = flowSteps.length;
    let step = 0;

    const interval = setInterval(() => {
      setActiveStep(step);
      setCurrentLatencies([
        Math.floor(Math.random() * 50) + 10,
        Math.floor(Math.random() * 30) + 20,
        Math.floor(Math.random() * 100) + 50,
        Math.floor(Math.random() * 200) + 100,
        Math.floor(Math.random() * 500) + 200,
      ]);

      step++;
      if (step >= totalSteps) {
        step = 0;
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isFlowing]);

  useEffect(() => {
    const cleanup = simulateDataFlow();
    return cleanup;
  }, [simulateDataFlow]);

  const avgLatency = sources.reduce((acc, s) => acc + s.latency, 0) / sources.length;
  const avgReliability = sources.reduce((acc, s) => acc + s.reliability, 0) / sources.length;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {dapiName} 数据流
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">目标链: {targetChain}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                平均延迟: {avgLatency.toFixed(0)}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                可靠性: {avgReliability.toFixed(1)}%
              </span>
            </div>
            <button
              onClick={() => setIsFlowing(!isFlowing)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                isFlowing
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {isFlowing ? '暂停' : '播放'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              数据源 ({sources.length})
            </h4>
            <div className="space-y-3">
              {sources.map((source, index) => (
                <SourceNode
                  key={source.id}
                  source={source}
                  index={index}
                  isActive={isFlowing && activeStep === 0}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              数据流路径
            </h4>

            <div className="relative bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                {flowSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <FlowStepNode
                      step={step}
                      isActive={isFlowing && activeStep >= index}
                      isProcessing={isFlowing && activeStep === index}
                      latency={currentLatencies[index]}
                    />
                    {index < flowSteps.length - 1 && (
                      <FlowConnector
                        isActive={isFlowing && activeStep > index}
                        hasParticle={isFlowing && activeStep === index}
                      />
                    )}
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {isFlowing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                          正在处理: {flowSteps[activeStep]?.label}
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-500">
                          当前阶段延迟: {currentLatencies[activeStep] || 0}ms
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Database className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">数据源</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {sources.length}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">总延迟</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {currentLatencies.reduce((a, b) => a + b, 0)}ms
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">更新频率</span>
                </div>
                <p className="text-xl font-semibold text-gray-900 dark:text-white">10s</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DapiDataFlowVisualization;
