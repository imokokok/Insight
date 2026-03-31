'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Server,
  Database,
  Link2,
  Info,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Activity,
} from 'lucide-react';

import { semanticColors, chartColors } from '@/lib/config/colors';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'airnode' | 'dapi' | 'chain' | 'source';
  status: 'active' | 'inactive' | 'degraded';
  x: number;
  y: number;
  connections: string[];
  metadata?: {
    responseTime?: number;
    reliability?: number;
    chain?: string;
    provider?: string;
  };
}

export interface NetworkConnection {
  id: string;
  source: string;
  target: string;
  status: 'healthy' | 'degraded' | 'failed';
  latency: number;
  throughput?: number;
}

export interface NetworkTopologyChartProps {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
}

const nodeTypeConfig = {
  airnode: {
    icon: Server,
    color: '#10b981',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-700',
    label: 'Airnode',
  },
  dapi: {
    icon: Database,
    color: '#3b82f6',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-700',
    label: 'dAPI',
  },
  chain: {
    icon: Link2,
    color: '#8b5cf6',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-700',
    label: 'Chain',
  },
  source: {
    icon: Database,
    color: '#f59e0b',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-700',
    label: 'Source',
  },
};

function getStatusColor(status: NetworkNode['status']): string {
  switch (status) {
    case 'active':
      return semanticColors.success.DEFAULT;
    case 'degraded':
      return semanticColors.warning.DEFAULT;
    case 'inactive':
      return semanticColors.danger.DEFAULT;
    default:
      return '#9ca3af';
  }
}

function getConnectionColor(status: NetworkConnection['status']): string {
  switch (status) {
    case 'healthy':
      return '#10b981';
    case 'degraded':
      return '#f59e0b';
    case 'failed':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
}

function TopologyNode({
  node,
  isSelected,
  onClick,
  scale,
}: {
  node: NetworkNode;
  isSelected: boolean;
  onClick: () => void;
  scale: number;
}) {
  const config = nodeTypeConfig[node.type];
  const Icon = config.icon;
  const statusColor = getStatusColor(node.status);

  return (
    <motion.g
      className="cursor-pointer"
      onClick={onClick}
      style={{ transform: `translate(${node.x}px, ${node.y}px)` }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <circle
        r={24 * scale}
        fill={isSelected ? config.color : 'white'}
        stroke={config.color}
        strokeWidth={2}
        className="dark:fill-gray-800"
      />
      <circle
        r={28 * scale}
        fill="none"
        stroke={statusColor}
        strokeWidth={2}
        strokeDasharray="4 2"
        opacity={0.5}
      />
      {node.status === 'active' && (
        <circle
          r={32 * scale}
          fill="none"
          stroke={statusColor}
          strokeWidth={1}
          opacity={0.3}
          className="animate-ping"
        />
      )}
      <foreignObject x={-12 * scale} y={-12 * scale} width={24 * scale} height={24 * scale}>
        <div className="w-full h-full flex items-center justify-center">
          <Icon className="w-4 h-4" style={{ color: isSelected ? 'white' : config.color }} />
        </div>
      </foreignObject>
    </motion.g>
  );
}

function TopologyConnection({
  connection,
  sourceNode,
  targetNode,
  isHighlighted,
}: {
  connection: NetworkConnection;
  sourceNode: NetworkNode;
  targetNode: NetworkNode;
  isHighlighted: boolean;
}) {
  const color = getConnectionColor(connection.status);
  const [particlePos, setParticlePos] = useState(0);

  useEffect(() => {
    if (connection.status === 'healthy') {
      const interval = setInterval(() => {
        setParticlePos((pos) => (pos + 0.02) % 1);
      }, 50);
      return () => clearInterval(interval);
    }
  }, [connection.status]);

  const midX = (sourceNode.x + targetNode.x) / 2;
  const midY = (sourceNode.y + targetNode.y) / 2;
  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const controlOffset = Math.sqrt(dx * dx + dy * dy) * 0.2;
  const perpX = (-dy / Math.sqrt(dx * dx + dy * dy)) * controlOffset;
  const perpY = (dx / Math.sqrt(dx * dx + dy * dy)) * controlOffset;

  const path = `M ${sourceNode.x} ${sourceNode.y} Q ${midX + perpX} ${midY + perpY} ${targetNode.x} ${targetNode.y}`;
  const particleX = sourceNode.x + (targetNode.x - sourceNode.x) * particlePos;
  const particleY = sourceNode.y + (targetNode.y - sourceNode.y) * particlePos;

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted ? 3 : 2}
        strokeOpacity={isHighlighted ? 1 : 0.5}
        strokeDasharray={connection.status === 'degraded' ? '5 5' : undefined}
      />
      {connection.status === 'healthy' && (
        <circle r={4} fill={color} opacity={0.8}>
          <animateMotion dur="2s" repeatCount="indefinite">
            <mpath href={`#path-${connection.id}`} />
          </animateMotion>
        </circle>
      )}
      {connection.status === 'healthy' && (
        <circle cx={particleX} cy={particleY} r={3} fill={color} opacity={0.6} />
      )}
    </g>
  );
}

export function NetworkTopologyChart({ nodes, connections }: NetworkTopologyChartProps) {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<NetworkConnection | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const stats = useMemo(() => {
    const activeNodes = nodes.filter((n) => n.status === 'active').length;
    const healthyConnections = connections.filter((c) => c.status === 'healthy').length;
    const avgLatency = connections.reduce((acc, c) => acc + c.latency, 0) / connections.length;

    return {
      totalNodes: nodes.length,
      activeNodes,
      totalConnections: connections.length,
      healthyConnections,
      avgLatency,
      nodeHealth: (activeNodes / nodes.length) * 100,
      connectionHealth: (healthyConnections / connections.length) * 100,
    };
  }, [nodes, connections]);

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNode(null);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(selectedNode?.id === node.id ? null : node);
  };

  const relatedConnections = useMemo(() => {
    if (!selectedNode) return [];
    return connections.filter((c) => c.source === selectedNode.id || c.target === selectedNode.id);
  }, [selectedNode, connections]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-lg flex items-center justify-center">
              <Network className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">网络拓扑图</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {stats.activeNodes}/{stats.totalNodes} 节点活跃 | {stats.healthyConnections}/
                {stats.totalConnections} 连接健康
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
        <div className="lg:col-span-3 relative bg-slate-50 dark:bg-gray-800 overflow-hidden">
          <svg
            ref={svgRef}
            width="100%"
            height="500"
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              {connections.map((conn) => (
                <path
                  key={`path-${conn.id}`}
                  id={`path-${conn.id}`}
                  d={`M ${nodes.find((n) => n.id === conn.source)?.x || 0} ${nodes.find((n) => n.id === conn.source)?.y || 0} L ${nodes.find((n) => n.id === conn.target)?.x || 0} ${nodes.find((n) => n.id === conn.target)?.y || 0}`}
                />
              ))}
            </defs>

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {connections.map((connection) => {
                const sourceNode = nodes.find((n) => n.id === connection.source);
                const targetNode = nodes.find((n) => n.id === connection.target);
                if (!sourceNode || !targetNode) return null;

                const isHighlighted =
                  selectedNode?.id === connection.source ||
                  selectedNode?.id === connection.target ||
                  hoveredConnection?.id === connection.id;

                return (
                  <TopologyConnection
                    key={connection.id}
                    connection={connection}
                    sourceNode={sourceNode}
                    targetNode={targetNode}
                    isHighlighted={isHighlighted}
                  />
                );
              })}

              {nodes.map((node) => (
                <TopologyNode
                  key={node.id}
                  node={node}
                  isSelected={selectedNode?.id === node.id}
                  onClick={() => handleNodeClick(node)}
                  scale={1}
                />
              ))}
            </g>
          </svg>

          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">节点类型</p>
            <div className="space-y-1.5">
              {Object.entries(nodeTypeConfig).map(([type, config]) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">{config.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">连接状态</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-emerald-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">健康</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-0.5 bg-amber-500"
                  style={{
                    background:
                      'repeating-linear-gradient(90deg, #f59e0b, #f59e0b 2px, transparent 2px, transparent 4px)',
                  }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">降级</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-red-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">故障</span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              网络状态
            </h4>

            <div className="space-y-4">
              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">节点健康度</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.nodeHealth.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.nodeHealth}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">连接健康度</span>
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    {stats.connectionHealth.toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-emerald-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.connectionHealth}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">平均延迟</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.avgLatency.toFixed(0)}ms
                  </p>
                </div>
                <div className="p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-xs text-gray-500 dark:text-gray-400">总连接</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {stats.totalConnections}
                  </p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: nodeTypeConfig[selectedNode.type].color }}
                    >
                      {(() => {
                        const Icon = nodeTypeConfig[selectedNode.type].icon;
                        return <Icon className="w-4 h-4 text-white" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedNode.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {nodeTypeConfig[selectedNode.type].label}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">状态</span>
                      <span
                        className={`font-medium ${
                          selectedNode.status === 'active'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : selectedNode.status === 'degraded'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {selectedNode.status.toUpperCase()}
                      </span>
                    </div>
                    {selectedNode.metadata?.responseTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">响应时间</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedNode.metadata.responseTime}ms
                        </span>
                      </div>
                    )}
                    {selectedNode.metadata?.reliability && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">可靠性</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedNode.metadata.reliability}%
                        </span>
                      </div>
                    )}
                    {selectedNode.metadata?.chain && (
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">链</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedNode.metadata.chain}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">连接数</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {relatedConnections.length}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NetworkTopologyChart;
