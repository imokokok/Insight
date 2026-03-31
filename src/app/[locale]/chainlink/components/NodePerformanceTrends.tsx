'use client';

import { useState, useMemo } from 'react';

import { Activity, Clock, Award, ChevronDown, ChevronUp, TrendingUp, Zap } from 'lucide-react';

import { ProgressRing } from '@/components/oracle/charts/ProgressRing';
import { SparklineChart } from '@/components/oracle/charts/SparklineChart';
import { useTranslations } from '@/i18n';

import { type NodeData } from '../types';

interface NodePerformanceTrendsProps {
  nodes: NodeData[];
}

interface NodeTrendData {
  successRateTrend: number[];
  responseTimeTrend: number[];
  reputationTrend: number[];
}

// Generate deterministic trend data for a node
function generateNodeTrends(node: NodeData): NodeTrendData {
  const days = 30;
  const nodeSeed = node.id.charCodeAt(0);

  // Success rate trend (very stable, slight variations)
  const successRateTrend = Array.from({ length: days }, (__, i) => {
    const baseRate = node.successRate;
    // Use deterministic pseudo-random based on node seed and index
    const variation = Math.sin(i * nodeSeed * 0.1) * 0.5 * 0.4;
    return Math.min(100, Math.max(99, baseRate + variation));
  });

  // Response time trend (more variation)
  const responseTimeTrend = Array.from({ length: days }, (__, i) => {
    const baseTime = node.responseTime;
    const variation = Math.cos(i * nodeSeed * 0.15) * 0.5 * 40;
    return Math.max(80, baseTime + variation);
  });

  // Reputation trend (gradual changes)
  const reputationTrend = Array.from({ length: days }, (__, i) => {
    const progress = i / days;
    const baseRep = node.reputation - 2 + progress * 4;
    const variation = Math.sin(i * nodeSeed * 0.08) * 0.5 * 1;
    return Math.min(100, Math.max(85, baseRep + variation));
  });

  return { successRateTrend, responseTimeTrend, reputationTrend };
}

export function NodePerformanceTrends({ nodes }: NodePerformanceTrendsProps) {
  const t = useTranslations();
  const [selectedNodes, setSelectedNodes] = useState<string[]>([nodes[0]?.id].filter(Boolean));
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const topNodes = useMemo(() => {
    return [...nodes].sort((a, b) => b.reputation - a.reputation).slice(0, 5);
  }, [nodes]);

  const nodeTrends = useMemo(() => {
    const trends: Record<string, NodeTrendData> = {};
    nodes.forEach((node) => {
      trends[node.id] = generateNodeTrends(node);
    });
    return trends;
  }, [nodes]);

  const toggleNodeSelection = (nodeId: string) => {
    setSelectedNodes((prev) =>
      prev.includes(nodeId) ? prev.filter((id) => id !== nodeId) : [...prev, nodeId]
    );
  };

  const selectedNodesData = useMemo(() => {
    return nodes.filter((node) => selectedNodes.includes(node.id));
  }, [nodes, selectedNodes]);

  const averageSuccessRate = useMemo(() => {
    if (selectedNodesData.length === 0) return 0;
    return (
      selectedNodesData.reduce((acc, node) => acc + node.successRate, 0) / selectedNodesData.length
    );
  }, [selectedNodesData]);

  const averageResponseTime = useMemo(() => {
    if (selectedNodesData.length === 0) return 0;
    return (
      selectedNodesData.reduce((acc, node) => acc + node.responseTime, 0) / selectedNodesData.length
    );
  }, [selectedNodesData]);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">
              {t('chainlink.nodes.avgSuccessRate')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{averageSuccessRate.toFixed(2)}%</div>
          <div className="text-xs text-gray-500 mt-1">
            {selectedNodesData.length} {t('chainlink.nodes.selected')}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">
              {t('chainlink.nodes.avgResponseTime')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(averageResponseTime)}ms
          </div>
          <div className="text-xs text-gray-500 mt-1">{t('chainlink.nodes.last30Days')}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">
              {t('chainlink.nodes.topReputation')}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {topNodes[0]?.reputation.toFixed(1) ?? '-'}
          </div>
          <div className="text-xs text-gray-500 mt-1">{topNodes[0]?.name ?? '-'}</div>
        </div>
      </div>

      {/* Node Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          {t('chainlink.nodes.selectNodesToCompare')}
        </h3>
        <div className="flex flex-wrap gap-2">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => toggleNodeSelection(node.id)}
              className={`
                px-3 py-1.5 rounded-md text-sm font-medium transition-all
                ${
                  selectedNodes.includes(node.id)
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              {node.name}
            </button>
          ))}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Success Rate Trend */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('chainlink.nodes.successRateTrend')}
              </h3>
            </div>
            <span className="text-xs text-gray-400">{t('chainlink.common.30d')}</span>
          </div>
          <div className="space-y-3">
            {selectedNodesData.slice(0, 3).map((node) => (
              <div key={node.id} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 truncate">{node.name}</div>
                <div className="flex-1">
                  <SparklineChart
                    data={nodeTrends[node.id]?.successRateTrend ?? []}
                    color="#10b981"
                    height={30}
                    width={200}
                    showArea={true}
                  />
                </div>
                <div className="w-14 text-right text-xs font-medium text-emerald-600">
                  {node.successRate}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Trend */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">
                {t('chainlink.nodes.responseTimeTrend')}
              </h3>
            </div>
            <span className="text-xs text-gray-400">{t('chainlink.common.30d')}</span>
          </div>
          <div className="space-y-3">
            {selectedNodesData.slice(0, 3).map((node) => (
              <div key={node.id} className="flex items-center gap-3">
                <div className="w-24 text-xs text-gray-600 truncate">{node.name}</div>
                <div className="flex-1">
                  <SparklineChart
                    data={nodeTrends[node.id]?.responseTimeTrend ?? []}
                    color="#3b82f6"
                    height={30}
                    width={200}
                    showArea={true}
                  />
                </div>
                <div className="w-14 text-right text-xs font-medium text-blue-600">
                  {node.responseTime}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Node Details Cards */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('chainlink.nodes.detailedPerformance')}
        </h3>
        <div className="space-y-3">
          {topNodes.map((node) => {
            const isExpanded = expandedNode === node.id;
            const trends = nodeTrends[node.id];

            return (
              <div key={node.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {node.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{node.name}</div>
                      <div className="text-xs text-gray-500">{node.region}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-xs text-gray-500">{t('chainlink.nodes.success')}</div>
                      <div className="text-sm font-semibold text-emerald-600">
                        {node.successRate}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500">{t('chainlink.nodes.response')}</div>
                      <div className="text-sm font-semibold text-blue-600">
                        {node.responseTime}ms
                      </div>
                    </div>
                    <div className="text-center hidden sm:block">
                      <ProgressRing
                        value={node.reputation}
                        max={100}
                        size={50}
                        strokeWidth={4}
                        showValue={true}
                        formatValue={(v) => v.toFixed(0)}
                        animate={false}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && trends && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Reputation Trend */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2">
                          {t('chainlink.nodes.reputationTrend')}
                        </div>
                        <SparklineChart
                          data={trends.reputationTrend}
                          color="#f59e0b"
                          height={60}
                          width={200}
                          showArea={true}
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-400">{t('chainlink.nodes.daysAgo')}</span>
                          <span className="text-amber-600 font-medium">
                            {trends.reputationTrend[trends.reputationTrend.length - 1]?.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      {/* Success Rate Mini Chart */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2">
                          {t('chainlink.nodes.successRateDetail')}
                        </div>
                        <SparklineChart
                          data={trends.successRateTrend}
                          color="#10b981"
                          height={60}
                          width={200}
                          showArea={true}
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-400">
                            {t('chainlink.nodes.min')}:{' '}
                            {Math.min(...trends.successRateTrend).toFixed(2)}%
                          </span>
                          <span className="text-emerald-600 font-medium">
                            {t('chainlink.nodes.avg')}:{' '}
                            {(
                              trends.successRateTrend.reduce((a, b) => a + b, 0) /
                              trends.successRateTrend.length
                            ).toFixed(2)}
                            %
                          </span>
                        </div>
                      </div>

                      {/* Response Time Mini Chart */}
                      <div>
                        <div className="text-xs text-gray-500 mb-2">
                          {t('chainlink.nodes.responseTimeDetail')}
                        </div>
                        <SparklineChart
                          data={trends.responseTimeTrend}
                          color="#3b82f6"
                          height={60}
                          width={200}
                          showArea={true}
                        />
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-400">
                            {t('chainlink.nodes.min')}:{' '}
                            {Math.min(...trends.responseTimeTrend).toFixed(0)}ms
                          </span>
                          <span className="text-blue-600 font-medium">
                            {t('chainlink.nodes.avg')}:{' '}
                            {Math.round(
                              trends.responseTimeTrend.reduce((a, b) => a + b, 0) /
                                trends.responseTimeTrend.length
                            )}
                            ms
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default NodePerformanceTrends;
