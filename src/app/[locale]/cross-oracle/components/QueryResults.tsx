'use client';

/**
 * @fileoverview 多预言机对比查询结果组件
 * @description 整合风险预警、数据质量检测、价格对比三大核心模块到一个统一卡片中
 */

import { memo } from 'react';

import { Database, TrendingUp, Shield, AlertTriangle, Activity } from 'lucide-react';

import { EmptyStateEnhanced, ProgressBar } from '@/components/ui';
import { useTranslations } from '@/i18n';
import type { OracleProvider, PriceData } from '@/types/oracle';

import { OracleComparisonMatrix } from './OracleComparisonMatrix';
import QualityDashboard from './QualityDashboard';
import RiskAlertDashboard from './RiskAlertDashboard';
import { SimplePriceTable } from './SimplePriceTable';

import type { TimeRange } from '../constants';
import type { PriceAnomaly } from '../hooks/usePriceAnomalyDetection';

// ============================================================================
// 类型定义
// ============================================================================

interface QualityScore {
  overall: number;
  consistency: number;
  freshness: number;
  completeness: number;
  suggestions: string[];
}

interface OracleFeature {
  provider: string;
  name: string;
  symbolCount: number;
  avgLatency: number;
  updateFrequency: string;
  features: string[];
  description: string;
}

interface QueryResultsProps {
  // 数据
  priceData: PriceData[];
  selectedOracles: OracleProvider[];
  selectedSymbol: string;
  timeRange: TimeRange;

  // 加载状态
  isLoading: boolean;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };

  // 统计数据
  avgPrice: number;
  medianPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  validPrices: number[];

  // 异常检测
  anomalies: PriceAnomaly[];
  anomalyCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  maxDeviation: number;

  // 质量评分
  qualityScore: QualityScore;

  // 预言机特性
  oracleFeatures: OracleFeature[];

  // 回调
  onRefresh: () => void;
}

// ============================================================================
// 加载状态组件
// ============================================================================

function LoadingState({
  queryProgress,
  currentQueryTarget,
}: {
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: string | null };
}) {
  const t = useTranslations();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-900">
            {t('crossOracle.loadingData') || 'Loading Data'}
          </h3>
        </div>
        <span className="text-xs text-gray-500">
          {queryProgress.completed} / {queryProgress.total}
        </span>
      </div>
      <ProgressBar
        progress={queryProgress.completed}
        total={queryProgress.total}
        showPercentage={true}
        size="md"
        variant="default"
      />
      <p className="text-xs text-gray-500 mt-2">
        {t('crossOracle.querying') || 'Querying'}{' '}
        {currentQueryTarget.oracle && t(`navbar.${currentQueryTarget.oracle.toLowerCase()}`)}
      </p>
    </div>
  );
}

// ============================================================================
// 空状态组件
// ============================================================================

function EmptyState({ selectedSymbol }: { selectedSymbol: string }) {
  const t = useTranslations();

  return (
    <EmptyStateEnhanced
      type="search"
      title={
        t('crossOracle.noDataTitle', { symbol: selectedSymbol }) || `No data for ${selectedSymbol}`
      }
      description={
        t('crossOracle.noDataDescription') ||
        'Please select oracles and query to view comparison data'
      }
      size="lg"
      variant="page"
    >
      <div className="mt-8 pt-6 border-t border-gray-100 w-full max-w-md">
        <p className="text-xs text-gray-400 mb-4 flex items-center justify-center gap-1">
          <TrendingUp className="w-3 h-3" aria-hidden="true" />
          {t('crossOracle.selectOraclesHint') || 'Select multiple oracles to compare'}
        </p>
      </div>
    </EmptyStateEnhanced>
  );
}

// ============================================================================
// 模块标题组件
// ============================================================================

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

function SectionHeader({ icon, title, description }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-lg bg-blue-50 text-blue-600">{icon}</div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function QueryResultsComponent({
  priceData,
  selectedOracles,
  selectedSymbol,
  isLoading,
  queryProgress,
  currentQueryTarget,
  medianPrice,
  minPrice,
  maxPrice,
  anomalies,
  anomalyCount,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  maxDeviation,
  qualityScore,
  oracleFeatures,
}: QueryResultsProps) {
  const t = useTranslations();

  // 加载状态
  if (isLoading) {
    return <LoadingState queryProgress={queryProgress} currentQueryTarget={currentQueryTarget} />;
  }

  // 空状态
  if (priceData.length === 0) {
    return <EmptyState selectedSymbol={selectedSymbol} />;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* 统一卡片头部 */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('crossOracle.comparisonResults') || 'Comparison Results'}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedSymbol} · {selectedOracles.length} {t('crossOracle.oracles') || 'oracles'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>{t('crossOracle.realTime') || 'Real-time'}</span>
          </div>
        </div>
      </div>

      {/* 模块1: 价格对比 */}
      <section className="p-6" aria-label="Price Comparison" id="price-comparison">
        <SectionHeader
          icon={<TrendingUp className="w-5 h-5" />}
          title={t('crossOracle.priceComparison') || 'Price Comparison'}
          description={
            t('crossOracle.priceComparisonDesc') ||
            'Multi-oracle price comparison and deviation analysis'
          }
        />
        <SimplePriceTable
          priceData={priceData}
          anomalies={anomalies}
          medianPrice={medianPrice}
          minPrice={minPrice}
          maxPrice={maxPrice}
          isLoading={isLoading}
          t={t}
        />
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 模块2: 风险预警 */}
      <section className="p-6" aria-label="Risk Alert">
        <SectionHeader
          icon={<AlertTriangle className="w-5 h-5" />}
          title={t('crossOracle.riskAlert') || 'Risk Alert'}
          description={
            t('crossOracle.riskAlertDesc') || 'Price anomaly detection and risk warnings'
          }
        />
        <RiskAlertDashboard
          anomalies={anomalies}
          count={anomalyCount}
          highRiskCount={highRiskCount}
          mediumRiskCount={mediumRiskCount}
          lowRiskCount={lowRiskCount}
          maxDeviation={maxDeviation}
          t={t}
        />
      </section>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 模块3: 数据质量检测 */}
      <section className="p-6" aria-label="Data Quality">
        <SectionHeader
          icon={<Shield className="w-5 h-5" />}
          title={t('crossOracle.dataQuality') || 'Data Quality'}
          description={
            t('crossOracle.dataQualityDesc') || 'Oracle data quality assessment and scoring'
          }
        />
        <QualityDashboard qualityScore={qualityScore} isLoading={isLoading} t={t} />
      </section>

      {/* 模块4: 预言机特性对比（可选） */}
      {oracleFeatures.length > 0 && (
        <>
          <div className="border-t border-gray-200" />
          <section className="p-6" aria-label="Oracle Features">
            <SectionHeader
              icon={<Database className="w-5 h-5" />}
              title={t('crossOracle.oracleFeatures') || 'Oracle Features'}
              description={
                t('crossOracle.oracleFeaturesDesc') ||
                'Comparison of oracle capabilities and features'
              }
            />
            <OracleComparisonMatrix
              oracleFeatures={oracleFeatures}
              selectedOracles={selectedOracles.map((o) => o as string)}
              t={t}
            />
          </section>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const QueryResults = memo(QueryResultsComponent);
QueryResults.displayName = 'QueryResults';

export default QueryResults;
