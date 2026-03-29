'use client';

import { useState, useMemo, useCallback } from 'react';

import { Globe, MapPin, Server, Activity, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';

import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';
import { formatNumber } from '@/lib/utils/format';

export interface AirnodeNode {
  id: string;
  name: string;
  region: string;
  coordinates: [number, number];
  responseTime: number;
  successRate: number;
  reputation: number;
  stakedAmount: number;
  status: 'active' | 'inactive' | 'degraded';
  chains: string[];
}

export interface AirnodeGeoMapProps {
  nodes: AirnodeNode[];
  onNodeClick?: (node: AirnodeNode) => void;
}

interface RegionStat {
  name: string;
  count: number;
  activeCount: number;
  avgResponseTime: number;
  avgSuccessRate: number;
  totalStake: number;
  nodes: AirnodeNode[];
  color: string;
}

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const regionColors: Record<string, string> = {
  'North America': chartColors.region.northAmerica,
  Europe: chartColors.region.europe,
  Asia: chartColors.region.asia,
  Other: chartColors.region.other,
};

function getStatusColor(status: AirnodeNode['status']): string {
  switch (status) {
    case 'active':
      return semanticColors.success.DEFAULT;
    case 'degraded':
      return semanticColors.warning.DEFAULT;
    case 'inactive':
      return semanticColors.danger.DEFAULT;
    default:
      return baseColors.gray[400];
  }
}

function getMarkerSize(stakedAmount: number, maxStake: number): number {
  const minSize = 4;
  const maxSize = 14;
  const ratio = maxStake > 0 ? stakedAmount / maxStake : 0;
  return minSize + ratio * (maxSize - minSize);
}

export function AirnodeGeoMap({ nodes, onNodeClick }: AirnodeGeoMapProps) {
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<AirnodeNode | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 30]);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: string;
  }>({ show: false, x: 0, y: 0, content: '' });

  const { regionStats, maxStake } = useMemo(() => {
    const stats: Record<string, RegionStat> = {};

    nodes.forEach((node) => {
      if (!stats[node.region]) {
        stats[node.region] = {
          name: node.region,
          count: 0,
          activeCount: 0,
          avgResponseTime: 0,
          avgSuccessRate: 0,
          totalStake: 0,
          nodes: [],
          color: regionColors[node.region] || baseColors.gray[400],
        };
      }
      stats[node.region].count++;
      stats[node.region].totalStake += node.stakedAmount;
      stats[node.region].avgResponseTime += node.responseTime;
      stats[node.region].avgSuccessRate += node.successRate;
      stats[node.region].nodes.push(node);
      if (node.status === 'active') {
        stats[node.region].activeCount++;
      }
    });

    Object.values(stats).forEach((region) => {
      region.avgResponseTime = region.count > 0 ? region.avgResponseTime / region.count : 0;
      region.avgSuccessRate = region.count > 0 ? region.avgSuccessRate / region.count : 0;
    });

    const max = Math.max(...nodes.map((n) => n.stakedAmount), 1);

    return { regionStats: Object.values(stats), maxStake: max };
  }, [nodes]);

  const handleRegionClick = useCallback(
    (regionName: string) => {
      const region = regionStats.find((r) => r.name === regionName);
      if (region) {
        const avgCoords: [number, number] = [
          region.nodes.reduce((sum, n) => sum + n.coordinates[0], 0) / region.nodes.length,
          region.nodes.reduce((sum, n) => sum + n.coordinates[1], 0) / region.nodes.length,
        ];
        setCenter(avgCoords);
        setZoom(2);
      }
      setSelectedRegion(selectedRegion === regionName ? null : regionName);
    },
    [regionStats, selectedRegion]
  );

  const handleNodeClick = useCallback(
    (node: AirnodeNode) => {
      setSelectedNode(selectedNode?.id === node.id ? null : node);
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick, selectedNode]
  );

  const handleMarkerMouseEnter = useCallback(
    (event: React.MouseEvent, node: AirnodeNode) => {
      setTooltip({
        show: true,
        x: event.clientX + 10,
        y: event.clientY - 10,
        content: `${node.name}\n${node.region} | ${node.status.toUpperCase()}\n响应时间: ${node.responseTime}ms | 成功率: ${node.successRate.toFixed(1)}%\n质押: ${formatNumber(node.stakedAmount, true)} API3`,
      });
    },
    []
  );

  const handleMarkerMouseMove = useCallback((event: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: event.clientX + 10,
      y: event.clientY - 10,
    }));
  }, []);

  const handleMarkerMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, show: false }));
  }, []);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const handleReset = () => {
    setZoom(1);
    setCenter([0, 30]);
    setSelectedRegion(null);
    setSelectedNode(null);
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Airnode 全球分布
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {nodes.length} 个节点 | {nodes.filter((n) => n.status === 'active').length} 活跃
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="缩小"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="放大"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="重置视图"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-0">
        <div className="lg:col-span-3 relative bg-slate-50 dark:bg-gray-800">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 140,
              center: [0, 30],
            }}
            className="w-full h-[500px]"
          >
            <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ coordinates, zoom: z }) => {
              setCenter(coordinates as [number, number]);
              setZoom(z);
            }}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={baseColors.slate[200]}
                      stroke={baseColors.slate[300]}
                      strokeWidth={0.5}
                      className="dark:fill-gray-700 dark:stroke-gray-600"
                      style={{
                        default: { outline: 'none' },
                        hover: { fill: baseColors.slate[300], outline: 'none' },
                        pressed: { outline: 'none' },
                      }}
                    />
                  ))
                }
              </Geographies>

              {nodes.map((node) => {
                const isHighlighted = selectedRegion === null || selectedRegion === node.region;
                const isSelected = selectedNode?.id === node.id;
                const statusColor = getStatusColor(node.status);
                const markerSize = getMarkerSize(node.stakedAmount, maxStake);

                return (
                  <Marker key={node.id} coordinates={node.coordinates}>
                    <g
                      className="cursor-pointer transition-all duration-200"
                      style={{ opacity: isHighlighted ? 1 : 0.2 }}
                      onClick={() => handleNodeClick(node)}
                      onMouseEnter={(e) => handleMarkerMouseEnter(e as unknown as React.MouseEvent, node)}
                      onMouseMove={handleMarkerMouseMove}
                      onMouseLeave={handleMarkerMouseLeave}
                    >
                      <circle
                        r={markerSize}
                        fill={statusColor}
                        stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.8)'}
                        strokeWidth={isSelected ? 3 : 2}
                        className="drop-shadow-md"
                      />
                      {(isSelected || node.status === 'active') && (
                        <circle
                          r={markerSize + 3}
                          fill="none"
                          stroke={statusColor}
                          strokeWidth={1.5}
                          opacity={0.4}
                          className="animate-ping"
                        />
                      )}
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>

          {tooltip.show && (
            <div
              className="fixed z-50 bg-gray-900 dark:bg-gray-700 text-white text-xs px-3 py-2 rounded-lg pointer-events-none whitespace-pre-line shadow-lg"
              style={{ left: tooltip.x, top: tooltip.y }}
            >
              {tooltip.content}
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">节点状态</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">活跃</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">降级</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">离线</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">节点大小</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">大小 = 质押量</p>
          </div>
        </div>

        <div className="lg:col-span-1 border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-500" />
              地区统计
            </h4>

            <div className="space-y-3">
              {regionStats.map((region) => (
                <button
                  key={region.name}
                  onClick={() => handleRegionClick(region.name)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    selectedRegion === region.name
                      ? 'bg-white dark:bg-gray-700 border-emerald-500 shadow-sm'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-emerald-300 dark:hover:border-emerald-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: region.color }}
                      />
                      <span className="font-medium text-gray-900 dark:text-white text-sm">
                        {region.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                      {region.activeCount}/{region.count}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Server className="w-3.5 h-3.5" />
                      <span>{region.count} 节点</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                      <Activity className="w-3.5 h-3.5" />
                      <span>{region.avgResponseTime.toFixed(0)}ms 平均延迟</span>
                    </div>
                  </div>

                  <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${nodes.length > 0 ? (region.count / nodes.length) * 100 : 0}%`,
                        backgroundColor: region.color,
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">总节点</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {nodes.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">活跃率</p>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                    {nodes.length > 0
                      ? ((nodes.filter((n) => n.status === 'active').length / nodes.length) * 100).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedNode && (
        <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">{selectedNode.name}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedNode.region} | {selectedNode.chains.join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">响应时间</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedNode.responseTime}ms
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">成功率</p>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {selectedNode.successRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">质押量</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatNumber(selectedNode.stakedAmount, true)} API3
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AirnodeGeoMap;
