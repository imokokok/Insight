'use client';

import { useState, useEffect, useCallback } from 'react';

type HealthStatus = 'healthy' | 'warning' | 'critical';

interface DataSource {
  id: string;
  name: string;
  type: 'exchange' | 'api_provider' | 'node_operator';
  status: HealthStatus;
  latency: number;
  uptime: number;
  lastUpdate: Date;
  location: string;
  reliability: number;
  dataPoints: number;
  contribution: number;
}

interface ValidationNode {
  id: string;
  name: string;
  status: HealthStatus;
  responseTime: number;
  accuracy: number;
  stake: number;
  reputation: number;
}

interface AggregationStep {
  id: number;
  name: string;
  description: string;
  status: 'completed' | 'processing' | 'pending';
  timestamp?: Date;
}

interface GeographicDistribution {
  region: string;
  nodeCount: number;
  percentage: number;
  avgLatency: number;
}

interface DependencyMetric {
  source: string;
  dependency: number;
  risk: 'low' | 'medium' | 'high';
  description: string;
}

const healthConfig = {
  healthy: {
    color: 'green',
    bgColor: 'bg-success-500',
    textColor: 'text-success-600',
    borderColor: 'border-green-200',
    bgGradient: 'from-green-50 to-green-100',
    label: '健康',
    pulseColor: 'bg-green-400',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-warning-500',
    textColor: 'text-warning-600',
    borderColor: 'border-yellow-200',
    bgGradient: 'from-yellow-50 to-yellow-100',
    label: '警告',
    pulseColor: 'bg-yellow-400',
  },
  critical: {
    color: 'red',
    bgColor: 'bg-danger-500',
    textColor: 'text-danger-600',
    borderColor: 'border-danger-200',
    bgGradient: 'from-red-50 to-red-100',
    label: '异常',
    pulseColor: 'bg-red-400',
  },
};

const dataSourceTypeConfig = {
  exchange: {
    label: '交易所',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    bgColor: 'bg-primary-50',
    textColor: 'text-primary-600',
  },
  api_provider: {
    label: 'API 提供商',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
  node_operator: {
    label: '节点运营商',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
        />
      </svg>
    ),
    bgColor: 'bg-success-50',
    textColor: 'text-success-600',
  },
};

function HealthIndicator({ status }: { status: HealthStatus }) {
  const config = healthConfig[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`relative flex h-2.5 w-2.5`}>
        <span
          className={`animate-ping absolute inline-flex h-full w-full  ${config.pulseColor} opacity-75`}
        ></span>
        <span className={`relative inline-flex  h-2.5 w-2.5 ${config.bgColor}`}></span>
      </span>
      <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
    </div>
  );
}

function DataSourceCard({ source }: { source: DataSource }) {
  const typeConfig = dataSourceTypeConfig[source.type];
  const healthConf = healthConfig[source.status];

  return (
    <div
      className={`bg-white border ${healthConf.borderColor}  p-4 hover: transition-all duration-200`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5  ${typeConfig.bgColor} ${typeConfig.textColor}`}>
            {typeConfig.icon}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{source.name}</h4>
            <p className="text-xs text-gray-500">{typeConfig.label}</p>
          </div>
        </div>
        <HealthIndicator status={source.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-50  p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">延迟</p>
          <p className="text-sm font-semibold text-gray-900">{source.latency}ms</p>
        </div>
        <div className="bg-gray-50  p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">在线率</p>
          <p className="text-sm font-semibold text-gray-900">{source.uptime.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-50  p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">可靠性</p>
          <p className="text-sm font-semibold text-gray-900">{source.reliability.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-50  p-2.5">
          <p className="text-xs text-gray-500 mb-0.5">贡献度</p>
          <p className="text-sm font-semibold text-gray-900">{source.contribution.toFixed(1)}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{source.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {source.lastUpdate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

function AggregationFlowChart() {
  const steps: AggregationStep[] = [
    { id: 1, name: '数据采集', description: '从多个数据源收集原始数据', status: 'completed' },
    { id: 2, name: '数据验证', description: '验证数据完整性和真实性', status: 'completed' },
    { id: 3, name: '异常检测', description: '识别并过滤异常数据点', status: 'completed' },
    { id: 4, name: '数据聚合', description: '加权平均计算最终价格', status: 'processing' },
    { id: 5, name: '共识验证', description: '验证节点达成共识', status: 'pending' },
    { id: 6, name: '链上发布', description: '将数据提交到区块链', status: 'pending' },
  ];

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">数据聚合流程</h3>
          <p className="text-xs text-gray-500 mt-0.5">从数据源到链上的完整流程</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5  bg-success-500"></div>
            <span className="text-gray-600">已完成</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5  bg-primary-500 animate-pulse"></div>
            <span className="text-gray-600">处理中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5  bg-gray-300"></div>
            <span className="text-gray-600">待处理</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10  flex items-center justify-center text-sm font-semibold ${
                    step.status === 'completed'
                      ? 'bg-success-500 text-white'
                      : step.status === 'processing'
                        ? 'bg-primary-500 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step.status === 'completed' ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.id
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-xs font-medium text-gray-900">{step.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 max-w-[80px]">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className="absolute top-5 left-[calc(50%+20px)] right-[calc(-50%+20px)] h-0.5 bg-gray-200">
                  <div
                    className={`h-full ${
                      step.status === 'completed' ? 'bg-success-500' : 'bg-gray-200'
                    }`}
                    style={{ width: step.status === 'completed' ? '100%' : '0%' }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500">处理时间</p>
            <p className="text-sm font-semibold text-gray-900">~2.3s</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">数据源数量</p>
            <p className="text-sm font-semibold text-gray-900">21 个</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">成功率</p>
            <p className="text-sm font-semibold text-success-600">99.97%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationMechanism() {
  const validationNodes: ValidationNode[] = [
    {
      id: '1',
      name: 'Node Alpha',
      status: 'healthy',
      responseTime: 45,
      accuracy: 99.98,
      stake: 125000,
      reputation: 98,
    },
    {
      id: '2',
      name: 'Node Beta',
      status: 'healthy',
      responseTime: 52,
      accuracy: 99.95,
      stake: 98000,
      reputation: 96,
    },
    {
      id: '3',
      name: 'Node Gamma',
      status: 'healthy',
      responseTime: 48,
      accuracy: 99.92,
      stake: 87000,
      reputation: 95,
    },
    {
      id: '4',
      name: 'Node Delta',
      status: 'warning',
      responseTime: 89,
      accuracy: 99.85,
      stake: 75000,
      reputation: 92,
    },
    {
      id: '5',
      name: 'Node Epsilon',
      status: 'healthy',
      responseTime: 55,
      accuracy: 99.9,
      stake: 68000,
      reputation: 94,
    },
  ];

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">数据验证机制</h3>
          <p className="text-xs text-gray-500 mt-0.5">共识验证与节点状态</p>
        </div>
        <div className="px-3 py-1 bg-success-100 text-success-700 text-xs font-medium ">共识已达成</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gray-100 border border-gray-200  p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-primary-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="text-xs text-gray-600">共识阈值</span>
          </div>
          <p className="text-2xl font-bold text-primary-600">67%</p>
          <p className="text-xs text-gray-500 mt-1">需要 2/3 节点同意</p>
        </div>
        <div className="bg-gray-100 border border-gray-200  p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-xs text-gray-600">验证节点数</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">21</p>
          <p className="text-xs text-gray-500 mt-1">当前活跃节点</p>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-700 mb-2">验证节点状态</p>
        {validationNodes.map((node) => (
          <div key={node.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 ">
            <div className="flex items-center gap-3">
              <HealthIndicator status={node.status} />
              <span className="text-sm font-medium text-gray-900">{node.name}</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <p className="text-gray-500">响应</p>
                <p className="font-medium text-gray-900">{node.responseTime}ms</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">准确率</p>
                <p className="font-medium text-gray-900">{node.accuracy}%</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500">声誉</p>
                <p className="font-medium text-gray-900">{node.reputation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GeographicDistribution() {
  const distributions: GeographicDistribution[] = [
    { region: '北美', nodeCount: 8, percentage: 38, avgLatency: 45 },
    { region: '欧洲', nodeCount: 7, percentage: 33, avgLatency: 52 },
    { region: '亚洲', nodeCount: 4, percentage: 19, avgLatency: 68 },
    { region: '其他', nodeCount: 2, percentage: 10, avgLatency: 85 },
  ];

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">地理分布</h3>
          <p className="text-xs text-gray-500 mt-0.5">数据源全球分布情况</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>全球分布</span>
        </div>
      </div>

      <div className="space-y-3">
        {distributions.map((dist) => (
          <div key={dist.region} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{dist.region}</span>
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{dist.nodeCount} 节点</span>
                <span className="text-gray-500">~{dist.avgLatency}ms</span>
                <span className="font-semibold text-gray-900">{dist.percentage}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-100  h-2">
              <div
                className="bg-gray-100 border border-gray-200 h-2  transition-all duration-500"
                style={{ width: `${dist.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-gray-500">总节点数</p>
            <p className="text-lg font-bold text-gray-900">21</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">覆盖地区</p>
            <p className="text-lg font-bold text-gray-900">4</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">平均延迟</p>
            <p className="text-lg font-bold text-gray-900">58ms</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DependencyAnalysis() {
  const dependencies: DependencyMetric[] = [
    { source: 'Binance', dependency: 28, risk: 'medium', description: '主要价格来源' },
    { source: 'Coinbase', dependency: 22, risk: 'low', description: '稳定数据源' },
    { source: 'Kraken', dependency: 18, risk: 'low', description: '备用数据源' },
    { source: 'OKX', dependency: 15, risk: 'low', description: '亚洲市场数据' },
    { source: '其他', dependency: 17, risk: 'low', description: '多样化来源' },
  ];

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return 'text-success-600 bg-success-100';
      case 'medium':
        return 'text-warning-600 bg-warning-100';
      case 'high':
        return 'text-danger-600 bg-danger-100';
    }
  };

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">依赖度分析</h3>
          <p className="text-xs text-gray-500 mt-0.5">数据源依赖分布与风险评估</p>
        </div>
        <div className="px-3 py-1 bg-warning-100 text-warning-700 text-xs font-medium ">
          中等集中度
        </div>
      </div>

      <div className="space-y-3">
        {dependencies.map((dep) => (
          <div key={dep.source} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{dep.source}</span>
                <span className={`text-xs px-2 py-0.5  ${getRiskColor(dep.risk)}`}>
                  {dep.risk === 'low' ? '低风险' : dep.risk === 'medium' ? '中风险' : '高风险'}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{dep.dependency}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100  h-1.5">
                <div
                  className={`h-1.5  transition-all duration-500 ${
                    dep.risk === 'high'
                      ? 'bg-danger-500'
                      : dep.risk === 'medium'
                        ? 'bg-warning-500'
                        : 'bg-success-500'
                  }`}
                  style={{ width: `${dep.dependency}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500 w-20">{dep.description}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100">
        <div className="bg-primary-50  p-3">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-primary-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="text-xs font-medium text-primary-900">依赖度建议</p>
              <p className="text-xs text-primary-700 mt-0.5">
                前两大数据源占比 50%，建议增加更多数据源以降低集中度风险
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthOverview() {
  const healthMetrics = [
    { label: '数据源健康度', value: 95, status: 'healthy' },
    { label: '网络连接性', value: 99, status: 'healthy' },
    { label: '数据一致性', value: 98, status: 'healthy' },
    { label: '更新及时性', value: 92, status: 'warning' },
  ];

  return (
    <div className="bg-white border border-gray-200  p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">健康度监控</h3>
          <p className="text-xs text-gray-500 mt-0.5">实时数据源健康状态</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full  bg-green-400 opacity-75"></span>
            <span className="relative inline-flex  h-2.5 w-2.5 bg-success-500"></span>
          </span>
          <span className="text-xs text-gray-600">实时监控中</span>
        </div>
      </div>

      <div className="space-y-4">
        {healthMetrics.map((metric) => (
          <div key={metric.label}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-700">{metric.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-900">{metric.value}%</span>
                {metric.status === 'healthy' ? (
                  <svg
                    className="w-4 h-4 text-success-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4 text-warning-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-100  h-2">
              <div
                className={`h-2  transition-all duration-500 ${
                  metric.status === 'healthy' ? 'bg-success-500' : 'bg-warning-500'
                }`}
                style={{ width: `${metric.value}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
        <div className="bg-success-50  p-3 text-center">
          <p className="text-xs text-gray-500">健康数据源</p>
          <p className="text-xl font-bold text-success-600">18</p>
        </div>
        <div className="bg-warning-50  p-3 text-center">
          <p className="text-xs text-gray-500">需关注</p>
          <p className="text-xl font-bold text-warning-600">3</p>
        </div>
      </div>
    </div>
  );
}

export function DataSourceTraceability() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const generateMockDataSources = useCallback((): DataSource[] => {
    const sources: DataSource[] = [
      {
        id: '1',
        name: 'Binance',
        type: 'exchange',
        status: 'healthy',
        latency: 45,
        uptime: 99.98,
        lastUpdate: new Date(),
        location: '新加坡',
        reliability: 99.95,
        dataPoints: 1250000,
        contribution: 28,
      },
      {
        id: '2',
        name: 'Coinbase Pro',
        type: 'exchange',
        status: 'healthy',
        latency: 52,
        uptime: 99.95,
        lastUpdate: new Date(),
        location: '美国',
        reliability: 99.92,
        dataPoints: 980000,
        contribution: 22,
      },
      {
        id: '3',
        name: 'Kraken',
        type: 'exchange',
        status: 'healthy',
        latency: 48,
        uptime: 99.9,
        lastUpdate: new Date(),
        location: '美国',
        reliability: 99.88,
        dataPoints: 870000,
        contribution: 18,
      },
      {
        id: '4',
        name: 'OKX',
        type: 'exchange',
        status: 'warning',
        latency: 89,
        uptime: 98.5,
        lastUpdate: new Date(),
        location: '香港',
        reliability: 98.2,
        dataPoints: 650000,
        contribution: 15,
      },
      {
        id: '5',
        name: 'Kaiko',
        type: 'api_provider',
        status: 'healthy',
        latency: 35,
        uptime: 99.99,
        lastUpdate: new Date(),
        location: '法国',
        reliability: 99.97,
        dataPoints: 1500000,
        contribution: 10,
      },
      {
        id: '6',
        name: 'BraveNewCoin',
        type: 'api_provider',
        status: 'healthy',
        latency: 42,
        uptime: 99.95,
        lastUpdate: new Date(),
        location: '南非',
        reliability: 99.9,
        dataPoints: 920000,
        contribution: 7,
      },
      {
        id: '7',
        name: 'Node Operator A',
        type: 'node_operator',
        status: 'healthy',
        latency: 38,
        uptime: 99.92,
        lastUpdate: new Date(),
        location: '德国',
        reliability: 99.85,
        dataPoints: 450000,
        contribution: 5,
      },
      {
        id: '8',
        name: 'Node Operator B',
        type: 'node_operator',
        status: 'healthy',
        latency: 55,
        uptime: 99.88,
        lastUpdate: new Date(),
        location: '日本',
        reliability: 99.8,
        dataPoints: 380000,
        contribution: 4,
      },
      {
        id: '9',
        name: 'FTX',
        type: 'exchange',
        status: 'critical',
        latency: 250,
        uptime: 85.0,
        lastUpdate: new Date(Date.now() - 300000),
        location: '离线',
        reliability: 75.0,
        dataPoints: 0,
        contribution: 0,
      },
    ];
    return sources;
  }, []);

  useEffect(() => {
    setDataSources(generateMockDataSources());
    const interval = setInterval(() => {
      setDataSources((prev) =>
        prev.map((source) => ({
          ...source,
          latency: Math.max(20, source.latency + Math.round((Math.random() - 0.5) * 10)),
          lastUpdate: new Date(),
        }))
      );
      setLastUpdated(new Date());
    }, 10000);

    return () => clearInterval(interval);
  }, [generateMockDataSources]);

  const healthyCount = dataSources.filter((s) => s.status === 'healthy').length;
  const warningCount = dataSources.filter((s) => s.status === 'warning').length;
  const criticalCount = dataSources.filter((s) => s.status === 'critical').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">数据源追溯</h2>
          <p className="text-sm text-gray-500 mt-0.5">追踪数据从源头到链上的完整流程</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2  bg-success-500"></div>
            <span className="text-gray-600">健康 {healthyCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2  bg-warning-500"></div>
            <span className="text-gray-600">警告 {warningCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2  bg-danger-500"></div>
            <span className="text-gray-600">异常 {criticalCount}</span>
          </div>
          <div className="text-gray-400">|</div>
          <span className="text-gray-500">
            最后更新:{' '}
            {lastUpdated.toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      </div>

      <AggregationFlowChart />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ValidationMechanism />
        <HealthOverview />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeographicDistribution />
        <DependencyAnalysis />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">数据源列表</h3>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200  hover:bg-gray-50 transition-colors">
              全部
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
              交易所
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
              API 提供商
            </button>
            <button className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
              节点运营商
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dataSources.map((source) => (
            <DataSourceCard key={source.id} source={source} />
          ))}
        </div>
      </div>
    </div>
  );
}

export type {
  DataSource,
  ValidationNode,
  AggregationStep,
  GeographicDistribution,
  DependencyMetric,
};
