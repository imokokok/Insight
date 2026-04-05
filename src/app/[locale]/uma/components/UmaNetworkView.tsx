'use client';

import { useState, useRef, useCallback } from 'react';

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

export function UmaNetworkView({ config, networkStats, isLoading }: UmaNetworkViewProps) {
  const t = useTranslations();

  const umaStats = networkStats;
  const networkData = config.networkData;

  const [topologyNodes, setTopologyNodes] = useState<TopologyNode[]>([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
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
        return Server;
      case 'bridge':
        return Server;
      default:
        return Server;
    }
  };

  const metrics = [
    {
      label: t('uma.network.activeValidators'),
      value: umaStats?.activeValidators?.toLocaleString() || '-',
      change: null,
      trend: 'neutral' as const,
      icon: Users,
    },
    {
      label: t('uma.network.totalStaked'),
      value: umaStats?.totalStaked ? `${(umaStats.totalStaked / 1e6).toFixed(1)}M` : '-',
      change: null,
      trend: 'neutral' as const,
      icon: Database,
    },
    {
      label: t('uma.network.avgResponseTime'),
      value: umaStats?.avgResponseTime ? `${umaStats.avgResponseTime}ms` : '-',
      change: null,
      trend: 'neutral' as const,
      icon: Clock,
    },
    {
      label: t('uma.network.validatorUptime'),
      value: umaStats?.validatorUptime ? `${umaStats.validatorUptime}%` : '-',
      change: null,
      trend: 'neutral' as const,
      icon: Shield,
    },
  ];

  const dataSources = [
    { name: 'UMA Mainnet', status: 'active' as const, latency: '-', reliability: '-' },
    { name: 'Ethereum Node', status: 'active' as const, latency: '-', reliability: '-' },
    { name: 'Arbitrum Node', status: 'active' as const, latency: '-', reliability: '-' },
    { name: 'Optimism Node', status: 'active' as const, latency: '-', reliability: '-' },
  ];

  const overviewStats = [
    {
      label: t('uma.network.dataSources'),
      value: umaStats?.dataSources?.toString() || '-',
    },
    {
      label: t('uma.network.activeDisputes'),
      value: umaStats?.activeDisputes?.toString() || '-',
    },
    { label: t('uma.network.requests24h'), value: '-' },
    { label: t('uma.network.avgGas'), value: '-' },
  ];

  return (
    <div className="space-y-8">
      <NetworkHealthPanel config={networkData} />

      <div className="border-t border-gray-200" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
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
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {topologyNodes.length === 0 && (
                <text x="200" y="200" textAnchor="middle" className="text-sm fill-gray-400">
                  {t('common.noData')}
                </text>
              )}
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
                    {t('uma.network.reliability')}: {source.reliability}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">{source.latency}</span>
                {source.status === 'active' ? (
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
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
