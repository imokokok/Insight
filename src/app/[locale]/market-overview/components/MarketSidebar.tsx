'use client';

import { useState } from 'react';

import {
  AlertTriangle,
  Bell,
  Shield,
  ChevronRight,
  ChevronDown,
  Activity,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type MarketStats, type AnomalyData } from '../types';

import AnomalyAlert from './AnomalyAlert';
import PriceAlertConfig from './PriceAlertConfig';
import RiskDashboard from './RiskDashboard';

interface MarketSidebarProps {
  stats: MarketStats | null;
  anomalies: AnomalyData[];
  loading?: boolean;
  activeTab?: 'overview' | 'alerts' | 'risk';
  onTabChange?: (tab: 'overview' | 'alerts' | 'risk') => void;
}

export default function MarketSidebar({
  stats,
  anomalies,
  loading = false,
  activeTab = 'overview',
  onTabChange,
}: MarketSidebarProps) {
  const t = useTranslations('marketOverview.sidebar');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['stats', 'alerts'])
  );

  // 切换展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 获取趋势图标
  const getTrendIcon = (value: number) => {
    if (value > 0) {
      return <TrendingUp className="w-3.5 h-3.5 text-success-500" />;
    } else if (value < 0) {
      return <TrendingDown className="w-3.5 h-3.5 text-danger-500" />;
    }
    return <Activity className="w-3.5 h-3.5 text-gray-400" />;
  };

  // 格式化数值
  const formatValue = (value: number, prefix = '', suffix = '') => {
    return `${prefix}${value >= 0 ? '+' : ''}${value.toFixed(2)}${suffix}`;
  };

  // 格式化大数值
  const formatLargeValue = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-gray-200">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => onTabChange?.('overview')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('overview')}
        </button>
        <button
          onClick={() => onTabChange?.('alerts')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'alerts'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Bell className="w-4 h-4" />
            {t('alerts')}
            {anomalies?.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs font-medium bg-warning-100 text-warning-700">
                {anomalies.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => onTabChange?.('risk')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'risk'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <Shield className="w-4 h-4" />
            {t('risk')}
          </div>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Market Stats */}
            <div className="border border-gray-200">
              <button
                onClick={() => toggleSection('stats')}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900">{t('marketStats')}</span>
                {expandedSections.has('stats') ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedSections.has('stats') && (
                <div className="p-3 border-t border-gray-100 space-y-3">
                  {loading ? (
                    <div className="py-4 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent animate-spin" />
                    </div>
                  ) : stats ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{t('totalTVS')}</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatLargeValue(stats.totalTVS)}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            {getTrendIcon(stats.tvsChange24h)}
                            <span
                              className={`text-xs ${stats.tvsChange24h >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                            >
                              {formatValue(stats.tvsChange24h, '', '%')}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{t('totalChains')}</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {stats.totalChains}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{t('supported')}</div>
                        </div>
                        <div className="p-3 bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{t('totalProtocols')}</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {stats.totalProtocols}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{t('integrated')}</div>
                        </div>
                        <div className="p-3 bg-gray-50">
                          <div className="text-xs text-gray-500 mb-1">{t('oracleCount')}</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {stats.oracleCount}
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{t('active')}</div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">{t('marketDominance')}</span>
                          <span className="font-medium text-gray-900">
                            {stats.marketDominance?.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-2">
                          <span className="text-gray-500">{t('volatility24h')}</span>
                          <span className="font-medium text-gray-900">
                            {stats.volatility24h?.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-4 text-center text-gray-500 text-sm">{t('noData')}</div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Info */}
            <div className="p-4 bg-primary-50 border border-primary-100">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-900">{t('didYouKnow')}</h4>
                  <p className="text-sm text-gray-600 mt-1">{t('marketInfoTip')}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {/* Anomaly Alerts */}
            <div className="border border-gray-200">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning-500" />
                  <span className="font-medium text-gray-900">{t('anomalyAlerts')}</span>
                </div>
              </div>
              <div className="p-3">
                <AnomalyAlert data={anomalies || []} loading={loading} />
              </div>
            </div>

            {/* Price Alerts */}
            <div className="border border-gray-200">
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary-500" />
                  <span className="font-medium text-gray-900">{t('priceAlerts')}</span>
                </div>
              </div>
              <div className="p-3">
                <PriceAlertConfig
                  alerts={[]}
                  onAdd={() => {}}
                  onRemove={() => {}}
                  onUpdate={() => {}}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'risk' && (
          <div className="border border-gray-200">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-500" />
                <span className="font-medium text-gray-900">{t('riskAnalysis')}</span>
              </div>
            </div>
            <div className="p-3">
              <RiskDashboard data={null} loading={loading} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
