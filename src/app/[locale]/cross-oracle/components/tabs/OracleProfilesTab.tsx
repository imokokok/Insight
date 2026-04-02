'use client';

import {
  Zap,
  Shield,
  Globe,
  Clock,
  Coins,
  Activity,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { type OracleProvider } from '@/types/oracle';

import { oracleNames } from '../../constants';

interface OracleProfilesTabProps {
  oracleFeatures: {
    provider: OracleProvider;
    name: string;
    symbolCount: number;
    avgLatency: number;
    features: string[];
    description: string;
  }[];
  selectedOracles: OracleProvider[];
  t: (key: string, params?: Record<string, string | number>) => string;
}

// 预言机特性图标映射
const featureIconMap: Record<string, React.ElementType> = {
  去中心化: Shield,
  高吞吐量: Zap,
  低延迟: Clock,
  多链支持: Globe,
  经济高效: Coins,
  高可靠性: CheckCircle2,
  实时更新: Activity,
  链上验证: Shield,
  质押机制: Coins,
  治理代币: Coins,
  开源: ExternalLink,
};

// 获取特性图标
function getFeatureIcon(feature: string): React.ElementType {
  for (const [key, icon] of Object.entries(featureIconMap)) {
    if (feature.includes(key)) {
      return icon;
    }
  }
  return CheckCircle2;
}

// 获取延迟等级颜色
function getLatencyColor(avgLatency: number): string {
  if (avgLatency <= 1000) return 'text-emerald-600 bg-emerald-50';
  if (avgLatency <= 3000) return 'text-blue-600 bg-blue-50';
  if (avgLatency <= 5000) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
}

// 获取延迟等级标签
function getLatencyLabel(avgLatency: number): string {
  if (avgLatency <= 1000) return '极快';
  if (avgLatency <= 3000) return '快速';
  if (avgLatency <= 5000) return '一般';
  return '较慢';
}

// 格式化延迟显示
function formatLatency(avgLatency: number): string {
  if (avgLatency < 1000) {
    return `${avgLatency}ms`;
  }
  return `${(avgLatency / 1000).toFixed(1)}s`;
}

export function OracleProfilesTab({ oracleFeatures, selectedOracles, t }: OracleProfilesTabProps) {
  // 过滤已选中的预言机
  const filteredFeatures = oracleFeatures.filter((feature) =>
    selectedOracles.includes(feature.provider)
  );

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {t('crossOracle.oracleProfiles.title', { defaultValue: '预言机核心特性' })}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('crossOracle.oracleProfiles.subtitle', {
              defaultValue: '了解各预言机的核心能力和特性',
            })}
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {t('crossOracle.oracleProfiles.showing', { count: filteredFeatures.length })}
        </div>
      </div>

      {/* 预言机卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredFeatures.map((feature) => {
          const LatencyIcon = Clock;

          return (
            <Card
              key={feature.provider}
              className="overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* 头部：预言机名称和描述 */}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{feature.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{feature.description}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary-600" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* 核心指标 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {/* 支持币种数量 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Coins className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {t('crossOracle.oracleProfiles.symbolCount', { defaultValue: '支持币种' })}
                      </span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{feature.symbolCount}</p>
                  </div>

                  {/* 平均延迟 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <LatencyIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {t('crossOracle.oracleProfiles.avgLatency', { defaultValue: '平均延迟' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-semibold text-gray-900">
                        {formatLatency(feature.avgLatency)}
                      </p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${getLatencyColor(feature.avgLatency)}`}
                      >
                        {getLatencyLabel(feature.avgLatency)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 特性标签 */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    {t('crossOracle.oracleProfiles.features', { defaultValue: '核心特性' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {feature.features.map((feat, index) => {
                      const Icon = getFeatureIcon(feat);
                      return (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700 border border-primary-100"
                        >
                          <Icon className="w-3 h-3" />
                          {feat}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* 底部：提供商标识 */}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">
                      {t('crossOracle.oracleProfiles.provider', { defaultValue: '提供商' })}
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {oracleNames[feature.provider]}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 空状态 */}
      {filteredFeatures.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {t('crossOracle.oracleProfiles.noData', { defaultValue: '暂无预言机数据' })}
          </h3>
          <p className="text-sm text-gray-500 max-w-sm">
            {t('crossOracle.oracleProfiles.noDataDescription', {
              defaultValue: '请先在价格对比页面选择要查看的预言机',
            })}
          </p>
        </div>
      )}

      {/* 对比表格 */}
      {filteredFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('crossOracle.oracleProfiles.comparisonTable', { defaultValue: '特性对比表' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t('crossOracle.oracleProfiles.provider', { defaultValue: '提供商' })}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {t('crossOracle.oracleProfiles.symbolCount', { defaultValue: '支持币种' })}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">
                      {t('crossOracle.oracleProfiles.avgLatency', { defaultValue: '平均延迟' })}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">
                      {t('crossOracle.oracleProfiles.features', { defaultValue: '核心特性' })}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFeatures.map((feature, index) => (
                    <tr
                      key={feature.provider}
                      className={`border-b border-gray-100 last:border-0 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="font-medium text-gray-900">{feature.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {feature.symbolCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLatencyColor(feature.avgLatency)}`}
                        >
                          {formatLatency(feature.avgLatency)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {feature.features.slice(0, 3).map((feat, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                            >
                              {feat}
                            </span>
                          ))}
                          {feature.features.length > 3 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                              +{feature.features.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
