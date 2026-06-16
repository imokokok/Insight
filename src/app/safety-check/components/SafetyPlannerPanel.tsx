'use client';

import { useState, useEffect, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Target, Plus, Minus, ArrowDownUp, Check, AlertCircle, Sliders } from 'lucide-react';

import type {
  PositionInput,
  SafetyParameterPlan,
  AssetAdjustment,
} from '@/lib/protocols/protocolHealth';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

import { useSafetyPlanner } from '../hooks/useSafetyPlanner';

import { CountUp } from './CountUp';

interface SafetyPlannerPanelProps {
  position: PositionInput; // 传给 API 重新计算
}

type PlanTab = 'addCollateral' | 'repayBorrow' | 'withdrawable';

export function SafetyPlannerPanel({ position }: SafetyPlannerPanelProps) {
  const { plan, isLoading, error, targetDeviation, setTargetDeviation, generatePlan } =
    useSafetyPlanner();
  const [activeTab, setActiveTab] = useState<PlanTab>('addCollateral');

  // 当滑块停止拖动 500ms 后自动生成方案（防抖）
  useEffect(() => {
    const timer = setTimeout(() => {
      generatePlan(position, targetDeviation);
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDeviation, position]);

  // 可用 tab 列表
  const availableTabs = useMemo(() => {
    const tabs: { id: PlanTab; label: string; icon: typeof Plus }[] = [
      { id: 'addCollateral', label: 'Add Collateral', icon: Plus },
      { id: 'repayBorrow', label: 'Repay Debt', icon: Minus },
    ];
    if (plan?.plans.withdrawable) {
      tabs.push({ id: 'withdrawable', label: 'Withdrawable', icon: ArrowDownUp });
    }
    return tabs;
  }, [plan]);

  // 确保 activeTab 可用
  useEffect(() => {
    if (!availableTabs.find((t) => t.id === activeTab)) {
      setActiveTab('addCollateral');
    }
  }, [availableTabs, activeTab]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-gradient-to-br from-indigo-50/40 to-purple-50/30 rounded-lg border border-indigo-200 shadow-sm p-5"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
          <Sliders className="w-4 h-4 text-indigo-600" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Safety Parameter Planner</h4>
          <p className="text-xs text-gray-500">Set target deviation, get actionable adjustments</p>
        </div>
      </div>

      {/* ── 目标偏差滑块 ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" />
            Target Deviation Tolerance
          </label>
          <span className="text-lg font-bold text-indigo-600 font-mono">
            <CountUp end={targetDeviation} duration={300} decimals={1} />%
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={60}
          step={0.5}
          value={targetDeviation}
          onChange={(e) => setTargetDeviation(parseFloat(e.target.value))}
          className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-1">
          <span>1% (Strict)</span>
          <span>15% (Common)</span>
          <span>60% (Aggressive)</span>
        </div>
      </div>

      {/* ── 目标 HF 对比 ── */}
      {plan && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-3 mb-5"
        >
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Current HF</p>
            <p
              className={cn(
                'text-lg font-bold font-mono',
                plan.currentHealthFactor < plan.targetHealthFactor
                  ? 'text-red-600'
                  : 'text-emerald-600'
              )}
            >
              {plan.currentHealthFactor.toFixed(3)}
            </p>
          </div>
          <div className="bg-white rounded-lg p-3 border border-indigo-100">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wider">Target HF</p>
            <p className="text-lg font-bold font-mono text-indigo-600">
              {plan.targetHealthFactor.toFixed(3)}
            </p>
          </div>
          <div
            className={cn(
              'rounded-lg p-3 border',
              plan.needsAdjustment ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'
            )}
          >
            <p
              className={cn(
                'text-[10px] uppercase tracking-wider',
                plan.needsAdjustment ? 'text-red-400' : 'text-emerald-400'
              )}
            >
              {plan.needsAdjustment ? 'Gap' : 'Surplus'}
            </p>
            <p
              className={cn(
                'text-lg font-bold font-mono',
                plan.needsAdjustment ? 'text-red-600' : 'text-emerald-600'
              )}
            >
              {plan.needsAdjustment ? '+' : ''}
              {plan.gapPercent.toFixed(1)}%
            </p>
          </div>
        </motion.div>
      )}

      {/* ── 公式提示 ── */}
      {plan && (
        <div className="bg-indigo-50/50 rounded-md p-2.5 mb-4 text-xs text-gray-600 font-mono break-all">
          targetHF = (1 + δ) / (1 − δ) = (1 + {(targetDeviation / 100).toFixed(3)}) / (1 −{' '}
          {(targetDeviation / 100).toFixed(3)}) = {plan.targetHealthFactor.toFixed(3)}
        </div>
      )}

      {/* ── Loading / Error ── */}
      {isLoading && (
        <div className="flex items-center justify-center py-6 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mr-2" />
          Calculating adjustments...
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ── 三方案切换面板 ── */}
      {plan && !isLoading && (
        <>
          {/* Tab 切换 */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
            {availableTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderPlanTab(plan, activeTab)}
            </motion.div>
          </AnimatePresence>

          {/* 场景验证 */}
          <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 bg-white/60 rounded-md p-2.5">
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            After adjustment, worst-case HF at {targetDeviation}% deviation:
            <span
              className={cn(
                'font-mono font-bold ml-1',
                plan.projectedWorstCaseHF >= 1 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {plan.projectedWorstCaseHF.toFixed(3)}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}

function renderPlanTab(plan: SafetyParameterPlan, tab: PlanTab) {
  const planData = plan.plans[tab];
  if (!planData) return null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">{planData.description}</p>

      <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
        {planData.adjustments.map((adj, i) => (
          <AdjustmentRow key={i} adjustment={adj} />
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-gray-500">Total Adjustment</span>
        <span className="text-sm font-bold text-indigo-600 font-mono">
          ${planData.totalDeltaValueUsd.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

function AdjustmentRow({ adjustment: adj }: { adjustment: AssetAdjustment }) {
  const isPositive = adj.deltaAmount > 0;
  const actionConfig = {
    add_collateral: {
      label: 'Add',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      icon: Plus,
    },
    repay_borrow: {
      label: 'Repay',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      icon: Minus,
    },
    withdraw_collateral: {
      label: 'Withdraw',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: ArrowDownUp,
    },
  }[adj.action];

  const Icon = actionConfig.icon;

  return (
    <div className="flex items-center gap-3 p-3">
      <div className={cn('w-7 h-7 rounded-md flex items-center justify-center', actionConfig.bg)}>
        <Icon className={cn('w-3.5 h-3.5', actionConfig.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 text-sm">{adj.symbol}</span>
          <span
            className={cn(
              'text-[10px] font-semibold px-1.5 py-0.5 rounded',
              actionConfig.bg,
              actionConfig.color
            )}
          >
            {actionConfig.label}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {adj.currentAmount.toFixed(4)} →{' '}
          <span className="font-medium text-gray-600">{adj.targetAmount.toFixed(4)}</span>
        </div>
      </div>
      <div className="text-right">
        <p
          className={cn(
            'text-sm font-bold font-mono',
            isPositive ? actionConfig.color : 'text-red-600'
          )}
        >
          {isPositive ? '+' : ''}
          {adj.deltaAmount.toFixed(4)}
        </p>
        <p className="text-xs text-gray-400">{formatPrice(Math.abs(adj.deltaValueUsd))}</p>
      </div>
    </div>
  );
}
