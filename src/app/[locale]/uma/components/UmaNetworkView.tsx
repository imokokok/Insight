'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Users,
  Clock,
  Database,
  Shield,
  Server,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Move,
  Activity,
  Zap,
  Globe,
  AlertTriangle,
} from 'lucide-react';

import { NetworkHealthPanel } from '@/components/oracle';
import { useTranslations } from '@/i18n';
import { type UMANetworkStats } from '@/lib/oracles/uma/types';

import { type UmaNetworkViewProps } from '../types';

function isUMANetworkStats(data: unknown): data is UMANetworkStats {
  return (
    typeof data === 'object' &&
    data !== null &&
    'activeValidators' in data &&
    'validatorUptime' in data &&
    'avgResolutionTime' in data
  );
}

interface TopologyNode {
  id: string;
  name: string;
  type: 'validator' | 'relayer' | 'bridge';
  x: number;
  y: number;
  status: 'healthy' | 'warning' | 'critical';
  connections: string[];
  uptime: number;
  latency: number;
}

interface NetworkPerformance {
  avgBlockTime: number;
  throughput: number;
  crossChainLatency: number;
  congestionLevel: 'low' | 'medium' | 'high';
  pendingTransactions: number;
  networkLoad: number;
}

const generateTopologyNodes = (): TopologyNode[] => {
  const centerX = 200;
  const centerY = 200;
  const radius = 120;

  const validators: TopologyNode[] = [];
  const validatorCount = 8;

  for (let i = 0; i < validatorCount; i++) {
    const angle = (i / validatorCount) * 2 * Math.PI - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    const status = Math.random() > 0.15 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'critical';

    validators.push({
      id: `validator-${i}`,
      name: `Validator ${i + 1}`,
      type: 'validator',
      x,
      y,
      status,
      connections: i % 2 === 0 ? [`validator-${(i + 1) % validatorCount}`] : [],
      uptime: status === 'healthy' ? 99.5 + Math.random() * 0.5 : status === 'warning' ? 95 + Math.random() * 4 : 85 + Math.random() * 10,
      latency: status === 'healthy' ? 50 + Math.random() * 50 : status === 'warning' ? 100 + Math.random() * 100 : 200 + Math.random() * 200,
    });
  }

  validators.push({
    id: 'relayer-main',
    name: 'Main Relayer',
    type: 'relayer',
    x: centerX,
    y: centerY,
    status: 'healthy',
    connections: validators.slice(0, 4).map(v => v.id),
    uptime: 99.9,
    latency: 45,
  });

  validators.push({
    id: 'bridge-eth',
    name: 'ETH Bridge',
    type: 'bridge',
    x: centerX - 150,
    y: centerY + 100,
    status: 'healthy',
    connections: ['relayer-main'],
    uptime: 99.8,
    latency: 120,
  });

  validators.push({
    id: 'bridge-arb',
    name: 'Arbitrum Bridge',
    type: 'bridge',
    x: centerX + 150,
    y: centerY + 100,
    status: 'healthy',
    connections: ['relayer-main'],
    uptime: 99.7,
    latency: 85,
  });

  return validators;
};

const generatePerformanceData = (): NetworkPerformance => ({
  avgBlockTime: 12.1 + Math.random() * 2,
  throughput: 850 + Math.random() * 300,
  crossChainLatency: 180 + Math.random() * 60,
  congestionLevel: Math.random() > 0.7 ? 'high' : Math.random() > 0.4 ? 'medium' : 'low',
  pendingTransactions: Math.floor(1500 + Math.random() * 2000),
  networkLoad: 45 + Math.random() * 40,
});

export function UmaNetworkView({ config, networkStats, isLoading }: UmaNetworkViewProps) {
  const t = useTranslations();

  const umaStats = networkStats;
  const networkData = config.networkData;

  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>([]);
  const [performance, setPerformance] = useState<NetworkPerformance | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setTopologyNodes(generateTopologyNodes());
    setPerformance(generatePerformanceData());
  }, []);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = () => setIsDragging(false);

  const getNodeColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return { fill: '#10b981', stroke: '#059669' };
      case 'warning':
        return { fill: '#f59e0b', stroke: '#d97706' };
      case 'critical':
        return { fill: '#ef4444', stroke: '#dc2626' };
      default:
        return { fill: '#6b7280', stroke: '#4b5563' };
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'validator':
        return Shield;
      case 'relayer':
        return Zap;
      case 'bridge':
        return Globe;
      default:
        return Server;
    }
  };

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-emerald-600 bg-emerald-50';
      case 'medium':
        return 'text-amber-600 bg-amber-50';
      case 'high':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const metrics = [
    {
      label: t('uma.network.activeValidators'),
      value: umaStats?.activeValidators?.toLocaleString() || '850',
      change: '+3%',
      trend: 'up' as const,
      icon: Users,
    },
    {
      label: t('uma.network.totalStaked'),
      value: `${((umaStats?.totalStaked || networkData?.totalStaked || 25000000) / 1e6).toFixed(1)}M`,
      change: '+8%',
      trend: 'up' as const,
      icon: Database,
    },
    {
      label: t('uma.network.avgResponseTime'),
      value: `${umaStats?.avgResponseTime || networkData?.avgResponseTime || 180}ms`,
      change: '-5%',
      trend: 'down' as const,
      icon: Clock,
    },
    {
      label: t('uma.network.validatorUptime'),
      value: `${umaStats?.validatorUptime || 99.5}%`,
      change: '+0.1%',
      trend: 'up' as const,
      icon: Shield,
    },
  ];

  const hourlyActivity = [
    45, 52, 48, 61, 55, 72, 68, 85, 92, 88, 76, 82, 95, 89, 78, 85, 91, 87, 73, 69, 58, 52, 48, 44,
  ];

  const dataSources = [
    { name: 'UMA Mainnet', status: 'active' as const, latency: '150ms', reliability: 99.9 },
    { name: 'Ethereum Node 1', status: 'active' as const, latency: '245ms', reliability: 99.8 },
    { name: 'Ethereum Node 2', status: 'active' as const, latency: '280ms', reliability: 99.7 },
    { name: 'Arbitrum Node', status: 'active' as const, latency: '120ms', reliability: 99.9 },
    { name: 'Optimism Node', status: 'syncing' as const, latency: '350ms', reliability: 98.5 },
    { name: 'Backup Node', status: 'active' as const, latency: '420ms', reliability: 99.5 },
  ];

  const overviewStats = [
    {
      label: t('uma.network.dataSources') || 'Data Sources',
      value: (umaStats?.dataSources || 320).toString(),
    },
    {
      label: t('uma.network.activeDisputes') || 'Active Disputes',
      value: (umaStats?.activeDisputes || 23).toString(),
    },
    { label: t('uma.network.requests24h') || 'Requests (24h)', value: '1.2M' },
    { label: t('uma.network.avgGas') || 'Avg Gas Used', value: '125K' },
  ];

  const performanceMetrics = performance
    ? [
        {
          label: t('uma.network.avgBlockTime') || 'Avg Block Time',
          value: `${performance.avgBlockTime.toFixed(1)}s`,
          icon: Clock,
          color: 'text-blue-600',
        },
        {
          label: t('uma.network.throughput') || 'Throughput',
          value: `${performance.throughput.toFixed(0)} TPS`,
          icon: Activity,
          color: 'text-emerald-600',
        },
        {
          label: t('uma.network.crossChainLatency') || 'Cross-chain Latency',
          value: `${performance.crossChainLatency.toFixed(0)}ms`,
          icon: Globe,
          color: 'text-purple-600',
        },
        {
          label: t('uma.network.congestion') || 'Network Congestion',
          value: performance.congestionLevel.toUpperCase(),
          icon: AlertTriangle,
          color:
            performance.congestionLevel === 'low'
              ? 'text-emerald-600'
              : performance.congestionLevel === 'medium'
                ? 'text-amber-600'
                : 'text-red-600',
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <NetworkHealthPanel config={networkData} />

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown;
          return (
            <div key={index} className="py-2">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{metric.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <p className="text-3xl font-semibold text-gray-900 tracking-tight">
                  {metric.value}
                </p>
                {metric.change && (
                  <div
                    className={`flex items-center gap-0.5 text-sm font-medium ${
                      metric.trend === 'up' ? 'text-emerald-600' : 'text-blue-600'
                    }`}
                  >
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span>{metric.change}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('uma.network.topology') || 'Network Topology'}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              title="Reset View"
            >
              <Move className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-500 ml-2">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="relative border border-gray-200 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-white">
          <svg
            ref={svgRef}
            width="100%"
            height="400"
            viewBox="0 0 400 400"
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#d1d5db" />
              </linearGradient>
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {topologyNodes.map(node =>
                node.connections.map(connId => {
                  const target = topologyNodes.find(n => n.id === connId);
                  if (!target) return null;
                  return (
                    <line
                      key={`${node.id}-${connId}`}
                      x1={node.x}
                      y1={node.y}
                      x2={target.x}
                      y2={target.y}
                      stroke="url(#connectionGradient)"
                      strokeWidth="1.5"
                      strokeDasharray={target.status === 'critical' ? '4,4' : 'none'}
                      opacity={0.6}
                    />
                  );
                })
              )}

              {topologyNodes.map(node => {
                const colors = getNodeColor(node.status);
                const Icon = getNodeIcon(node.type);
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedNode(node);
                    }}
                    className="cursor-pointer"
                    style={{ filter: isSelected ? 'url(#glow)' : 'none' }}
                  >
                    <circle
                      r={node.type === 'relayer' ? 28 : 20}
                      fill={colors.fill}
                      stroke={isSelected ? '#3b82f6' : colors.stroke}
                      strokeWidth={isSelected ? 3 : 2}
                      className="transition-all duration-200"
                    />

                    {node.status === 'warning' && (
                      <circle r={node.type === 'relayer' ? 32 : 24} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4,2">
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0"
                          to="360"
                          dur="3s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    {node.status === 'critical' && (
                      <circle r={node.type === 'relayer' ? 32 : 24} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2">
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0"
                          to="360"
                          dur="1.5s"
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}

                    <foreignObject x={-8} y={-8} width="16" height="16">
                      <div className="w-4 h-4 flex items-center justify-center">
                        <Icon className="w-3 h-3 text-white" />
                      </div>
                    </foreignObject>
                  </g>
                );
              })}

              {topologyNodes.map(node => (
                <text
                  key={`label-${node.id}`}
                  x={node.x}
                  y={node.y + (node.type === 'relayer' ? 40 : 32)}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-600 pointer-events-none"
                >
                  {node.name}
                </text>
              ))}
            </g>
          </svg>

          <div className="absolute bottom-3 left-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-gray-600">Healthy</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-gray-600">Warning</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-600">Critical</span>
            </div>
          </div>

          <div className="absolute top-3 right-3 flex items-center gap-2 text-xs text-gray-500">
            <Move className="w-3 h-3" />
            <span>Drag to pan</span>
          </div>
        </div>

        {selectedNode && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">{selectedNode.name}</h4>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Type</p>
                <p className="font-medium text-gray-900 capitalize">{selectedNode.type}</p>
              </div>
              <div>
                <p className="text-gray-500">Uptime</p>
                <p className="font-medium text-gray-900">{selectedNode.uptime.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-gray-500">Latency</p>
                <p className="font-medium text-gray-900">{selectedNode.latency.toFixed(0)}ms</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-medium text-gray-900">
            {t('uma.network.performanceMetrics') || 'Network Performance Metrics'}
          </h3>
          <span className="text-xs text-gray-500">Real-time</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {performanceMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${metric.color}`} />
                  <span className="text-xs text-gray-500">{metric.label}</span>
                </div>
                <p className={`text-xl font-semibold ${metric.color}`}>{metric.value}</p>
              </div>
            );
          })}
        </div>

        {performance && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">{t('uma.network.networkLoad') || 'Network Load'}</span>
                <span className="text-sm font-medium text-gray-900">{performance.networkLoad.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    performance.networkLoad > 80
                      ? 'bg-red-500'
                      : performance.networkLoad > 60
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                  }`}
                  style={{ width: `${performance.networkLoad}%` }}
                />
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">
                  {t('uma.network.pendingTx') || 'Pending Transactions'}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {performance.pendingTransactions.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    performance.pendingTransactions > 3000
                      ? 'bg-red-500'
                      : performance.pendingTransactions > 2000
                        ? 'bg-amber-500'
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((performance.pendingTransactions / 5000) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">
              {t('uma.network.hourlyActivity') || 'Hourly Activity'}
            </h3>
            <span className="text-sm text-gray-500">24h</span>
          </div>
          <div className="h-40 flex items-end gap-0.5">
            {hourlyActivity.map((value, index) => {
              const max = Math.max(...hourlyActivity);
              const height = (value / max) * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 transition-colors rounded-t"
                  style={{ height: `${Math.max(height, 8)}%` }}
                  title={`${value} validations`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>00:00</span>
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>23:59</span>
          </div>
        </div>

        <div>
          <h3 className="text-base font-medium text-gray-900 mb-5">
            {t('uma.network.performance')}
          </h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('uma.network.updateFrequency')}</span>
                <span className="font-medium text-gray-900">
                  {umaStats?.updateFrequency || networkData?.updateFrequency || 60}s
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '60%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('uma.network.disputeResolutionTime')}</span>
                <span className="font-medium text-gray-900">
                  {umaStats?.avgResolutionTime || 4.2}h
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">{t('uma.network.validatorEfficiency')}</span>
                <span className="font-medium text-gray-900">98.5%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '98.5%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.network.dataSources')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dataSources.map((source, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{source.name}</p>
                  <p className="text-xs text-gray-500">
                    {t('uma.network.reliability')}: {source.reliability}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{source.latency}</span>
                {source.status === 'active' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                ) : source.status === 'syncing' ? (
                  <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-gray-200" />

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('uma.network.overview') || 'Network Overview'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {overviewStats.map((stat, index) => (
            <div key={index}>
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className="text-xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
