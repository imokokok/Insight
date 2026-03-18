'use client';

import { useTranslations } from 'next-intl';
import {
  Calculator,
  Shield,
  TrendingUp,
  Activity,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Layers,
  ArrowRight,
  BookOpen,
  GitBranch,
  Target,
} from 'lucide-react';
import { baseColors, semanticColors } from '@/lib/config/colors';

export default function MethodologyPage() {
  const t = useTranslations();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 bg-dune min-h-screen">
      {/* Header */}
      <div className="mb-10 pb-6 border-b" style={{ borderColor: baseColors.gray[200] }}>
        <h1 className="text-3xl font-bold mb-3" style={{ color: baseColors.gray[900] }}>
          {t('methodology.title')}
        </h1>
        <p className="text-lg" style={{ color: baseColors.gray[600] }}>
          {t('methodology.subtitle')}
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4">
            <Calculator className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            {t('methodology.aggregation.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('methodology.aggregation.description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            {t('methodology.riskAssessment.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('methodology.riskAssessment.description')}
          </p>
        </div>

        <div className="bg-white border border-gray-200 p-6 rounded-lg">
          <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            {t('methodology.dataQuality.title')}
          </h3>
          <p className="text-sm text-gray-600">
            {t('methodology.dataQuality.description')}
          </p>
        </div>
      </div>

      {/* Price Aggregation Algorithm */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calculator className="w-5 h-5 text-blue-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('methodology.aggregation.sectionTitle')}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              {t('methodology.aggregation.intro')}
            </p>

            <div className="space-y-6">
              {/* Simple Average */}
              <div className="border-l-4 border-blue-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  {t('methodology.aggregation.simpleAverage.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.aggregation.simpleAverage.description')}
                </p>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm text-gray-700">
                  P<sub>avg</sub> = (P₁ + P₂ + ... + Pₙ) / n
                </div>
              </div>

              {/* Weighted Average */}
              <div className="border-l-4 border-green-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  {t('methodology.aggregation.weightedAverage.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.aggregation.weightedAverage.description')}
                </p>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm text-gray-700">
                  P<sub>weighted</sub> = Σ(wᵢ × Pᵢ) / Σwᵢ
                </div>
                <div className="mt-3 text-sm text-gray-600">
                  <p className="font-medium mb-2">{t('methodology.aggregation.weightFactors')}:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• {t('methodology.aggregation.factors.liquidity')}</li>
                    <li>• {t('methodology.aggregation.factors.volume')}</li>
                    <li>• {t('methodology.aggregation.factors.reputation')}</li>
                    <li>• {t('methodology.aggregation.factors.freshness')}</li>
                  </ul>
                </div>
              </div>

              {/* Median Price */}
              <div className="border-l-4 border-purple-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {t('methodology.aggregation.median.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.aggregation.median.description')}
                </p>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm text-gray-700">
                  P<sub>median</sub> = middle value of sorted prices
                </div>
              </div>

              {/* Trimmed Mean */}
              <div className="border-l-4 border-amber-500 pl-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" />
                  {t('methodology.aggregation.trimmedMean.title')}
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.aggregation.trimmedMean.description')}
                </p>
                <div className="bg-gray-50 p-3 rounded font-mono text-sm text-gray-700">
                  P<sub>trimmed</sub> = mean of prices after removing top/bottom 10%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Risk Assessment Dimensions */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-100 rounded-lg">
            <Shield className="w-5 h-5 text-green-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('methodology.riskAssessment.sectionTitle')}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              {t('methodology.riskAssessment.intro')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Centralization Risk */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                    <Layers className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {t('methodology.risk.centralization.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.risk.centralization.description')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                    {t('methodology.risk.centralization.high')}: &gt;70%
                  </span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
                    {t('methodology.risk.centralization.medium')}: 40-70%
                  </span>
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                    {t('methodology.risk.centralization.low')}: &lt;40%
                  </span>
                </div>
              </div>

              {/* Data Freshness Risk */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {t('methodology.risk.freshness.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.risk.freshness.description')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                    {t('methodology.risk.freshness.fresh')}: &lt;1min
                  </span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
                    {t('methodology.risk.freshness.stale')}: 1-5min
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                    {t('methodology.risk.freshness.expired')}: &gt;5min
                  </span>
                </div>
              </div>

              {/* Price Deviation Risk */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {t('methodology.risk.deviation.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.risk.deviation.description')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                    {t('methodology.risk.deviation.normal')}: &lt;0.5%
                  </span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
                    {t('methodology.risk.deviation.warning')}: 0.5-2%
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                    {t('methodology.risk.deviation.critical')}: &gt;2%
                  </span>
                </div>
              </div>

              {/* Liquidity Risk */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">
                    {t('methodology.risk.liquidity.title')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {t('methodology.risk.liquidity.description')}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-green-50 text-green-700 rounded">
                    {t('methodology.risk.liquidity.high')}: &gt;$10M
                  </span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">
                    {t('methodology.risk.liquidity.medium')}: $1M-10M
                  </span>
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">
                    {t('methodology.risk.liquidity.low')}: &lt;$1M
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Quality Metrics */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Database className="w-5 h-5 text-purple-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('methodology.dataQuality.sectionTitle')}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              {t('methodology.dataQuality.intro')}
            </p>

            <div className="space-y-4">
              {/* Completeness */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {t('methodology.dataQuality.completeness.title')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataQuality.completeness.description')}
                  </p>
                </div>
              </div>

              {/* Accuracy */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-green-100 rounded flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {t('methodology.dataQuality.accuracy.title')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataQuality.accuracy.description')}
                  </p>
                </div>
              </div>

              {/* Consistency */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {t('methodology.dataQuality.consistency.title')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataQuality.consistency.description')}
                  </p>
                </div>
              </div>

              {/* Timeliness */}
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">
                    {t('methodology.dataQuality.timeliness.title')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataQuality.timeliness.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Confidence Score Calculation */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-amber-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-amber-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('methodology.confidenceScore.title')}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              {t('methodology.confidenceScore.intro')}
            </p>

            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h4 className="font-medium text-gray-900 mb-3">
                {t('methodology.confidenceScore.formula')}
              </h4>
              <div className="font-mono text-sm text-gray-700 space-y-2">
                <p>Confidence = w₁×Freshness + w₂×Completeness + w₃×Consistency + w₄×SourceReliability</p>
                <p className="text-gray-500">where w₁ + w₂ + w₃ + w₄ = 1</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('methodology.confidenceScore.freshness')}
                  </span>
                  <span className="text-sm font-bold text-blue-600">30%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '30%' }} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('methodology.confidenceScore.completeness')}
                  </span>
                  <span className="text-sm font-bold text-green-600">25%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('methodology.confidenceScore.consistency')}
                  </span>
                  <span className="text-sm font-bold text-purple-600">25%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: '25%' }} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    {t('methodology.confidenceScore.reliability')}
                  </span>
                  <span className="text-sm font-bold text-amber-600">20%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '20%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources & Verification */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Database className="w-5 h-5 text-gray-700" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('methodology.dataSources.title')}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-6">
            <p className="text-gray-700 mb-6">
              {t('methodology.dataSources.intro')}
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {t('methodology.dataSources.primary')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataSources.primaryDesc')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {t('methodology.dataSources.secondary')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataSources.secondaryDesc')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>

              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">
                    {t('methodology.dataSources.tertiary')}
                  </h4>
                  <p className="text-sm text-gray-600">
                    {t('methodology.dataSources.tertiaryDesc')}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">
              {t('methodology.disclaimer.title')}
            </h4>
            <p className="text-sm text-blue-700">
              {t('methodology.disclaimer.content')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
