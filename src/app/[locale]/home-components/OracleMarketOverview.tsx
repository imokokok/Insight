'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import OraclePrefetchCard from './OraclePrefetchCard';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  ReferenceLine,
} from 'recharts';
import { TooltipProps, CustomLabelProps } from '@/types/ui/recharts';
import { PieChart as PieChartIcon } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { Table as TableIcon } from 'lucide-react';
import { Activity } from 'lucide-react';
import { DollarSign } from 'lucide-react';
import { Layers } from 'lucide-react';
import { Globe } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import { Info } from 'lucide-react';
import { ChartSkeleton } from '@/components/ui';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';


const COLORS = {
  chainlink: chartColors.oracle.chainlink,
  pyth: chartColors.oracle.pyth,
  band: chartColors.oracle['band-protocol'],
  api3: chartColors.oracle.api3,
  uma: chartColors.oracle.uma,
  redstone: chartColors.oracle.redstone,
  dia: chartColors.oracle.dia,
  tellor: chartColors.oracle.tellor,
  chronicle: chartColors.oracle.chronicle,
  winklink: chartColors.oracle.winklink,
  others: chartColors.oracle.redstone,
};

const marketShareData = [
  { name: 'Chainlink', value: 62.5, color: COLORS.chainlink, tvs: '$42.1B', chains: 15 },
  { name: 'Pyth Network', value: 18.3, color: COLORS.pyth, tvs: '$15.2B', chains: 20 },
  { name: 'Band Protocol', value: 8.7, color: COLORS.band, tvs: '$4.1B', chains: 12 },
  { name: 'API3', value: 6.2, color: COLORS.api3, tvs: '$3.5B', chains: 10 },
  { name: 'UMA', value: 4.3, color: COLORS.uma, tvs: '$2.5B', chains: 8 },
  { name: 'RedStone', value: 3.5, color: COLORS.redstone, tvs: '$2.1B', chains: 6 },
  { name: 'DIA', value: 2.8, color: COLORS.dia, tvs: '$1.6B', chains: 9 },
  { name: 'Tellor', value: 2.2, color: COLORS.tellor, tvs: '$1.3B', chains: 7 },
  { name: 'Chronicle', value: 1.8, color: COLORS.chronicle, tvs: '$1.0B', chains: 5 },
  { name: 'WINkLink', value: 1.2, color: COLORS.winklink, tvs: '$0.7B', chains: 3 },
];

const tvsTrendData = [
  {
    month: 'Jan',
    chainlink: 28,
    pyth: 5,
    band: 3,
    api3: 2,
    uma: 1.5,
    redstone: 1.2,
    dia: 0.9,
    tellor: 0.7,
    chronicle: 0.5,
    winklink: 0.4,
  },
  {
    month: 'Feb',
    chainlink: 30,
    pyth: 6,
    band: 3.2,
    api3: 2.2,
    uma: 1.6,
    redstone: 1.3,
    dia: 1.0,
    tellor: 0.75,
    chronicle: 0.55,
    winklink: 0.42,
  },
  {
    month: 'Mar',
    chainlink: 32,
    pyth: 7,
    band: 3.3,
    api3: 2.5,
    uma: 1.8,
    redstone: 1.4,
    dia: 1.1,
    tellor: 0.8,
    chronicle: 0.6,
    winklink: 0.45,
  },
  {
    month: 'Apr',
    chainlink: 35,
    pyth: 8,
    band: 3.5,
    api3: 2.8,
    uma: 2,
    redstone: 1.6,
    dia: 1.2,
    tellor: 0.85,
    chronicle: 0.65,
    winklink: 0.47,
  },
  {
    month: 'May',
    chainlink: 38,
    pyth: 10,
    band: 3.6,
    api3: 3,
    uma: 2.1,
    redstone: 1.8,
    dia: 1.3,
    tellor: 0.9,
    chronicle: 0.7,
    winklink: 0.48,
  },
  {
    month: 'Jun',
    chainlink: 40,
    pyth: 12,
    band: 3.8,
    api3: 3.2,
    uma: 2.2,
    redstone: 2.0,
    dia: 1.4,
    tellor: 1.0,
    chronicle: 0.8,
    winklink: 0.6,
  },
  {
    month: 'Jul',
    chainlink: 42.1,
    pyth: 15,
    band: 4,
    api3: 3.5,
    uma: 2.5,
    redstone: 2.1,
    dia: 1.6,
    tellor: 1.3,
    chronicle: 1.0,
    winklink: 0.7,
  },
];

const chainSupportData = [
  { name: 'Chainlink', chains: 15, color: COLORS.chainlink, protocols: 450 },
  { name: 'Pyth Network', chains: 20, color: COLORS.pyth, protocols: 280 },
  { name: 'Band Protocol', chains: 12, color: COLORS.band, protocols: 120 },
  { name: 'API3', chains: 10, color: COLORS.api3, protocols: 85 },
  { name: 'UMA', chains: 8, color: COLORS.uma, protocols: 45 },
  { name: 'RedStone', chains: 6, color: COLORS.redstone, protocols: 32 },
  { name: 'DIA', chains: 9, color: COLORS.dia, protocols: 28 },
  { name: 'Tellor', chains: 7, color: COLORS.tellor, protocols: 22 },
  { name: 'Chronicle', chains: 5, color: COLORS.chronicle, protocols: 18 },
  { name: 'WINkLink', chains: 3, color: COLORS.winklink, protocols: 12 },
];

const timeRanges = [
  { key: '1H', label: '1H' },
  { key: '24H', label: '24H' },
  { key: '7D', label: '7D' },
  { key: '30D', label: '30D' },
  { key: '90D', label: '90D' },
  { key: '1Y', label: '1Y' },
  { key: 'ALL', label: 'ALL' },
];

type ChartType = 'pie' | 'trend' | 'bar';
type ViewType = 'chart' | 'table';

interface MarketShareDataItem {
  name: string;
  value: number;
  color: string;
  tvs: string;
  chains: number;
  protocols?: number;
}

function OracleMarketOverviewBase() {
  const locale = useLocale();
  const [selectedRange, setSelectedRange] = useState('30D');
  const [activeChart, setActiveChart] = useState<ChartType>('pie');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const totalTVS = marketShareData.reduce((acc, item) => {
      const tvsValue = parseFloat(item.tvs.replace(/[$B]/g, ''));
      return acc + tvsValue;
    }, 0);

    const totalChains = chainSupportData.reduce((acc, item) => acc + item.chains, 0);
    const totalProtocols = chainSupportData.reduce((acc, item) => acc + item.protocols, 0);
    const avgDominance = marketShareData[0]?.value || 0;

    return {
      totalTVS: `$${totalTVS.toFixed(1)}B`,
      totalChains,
      totalProtocols,
      avgDominance: `${avgDominance}%`,
      oracleCount: marketShareData.length,
    };
  }, []);

  const renderCustomizedLabel = useCallback(
    ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: CustomLabelProps) => {
      if (!cx || !cy || !midAngle || !innerRadius || !outerRadius || !percent) return null;
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      return (
        <text
          x={x}
          y={y}
          fill={baseColors.gray[50]}
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          className="text-xs font-medium"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    },
    []
  );

  const CustomTooltip = useMemo(() => {
    const TooltipComponent = ({ active, payload, label }: TooltipProps<MarketShareDataItem>) => {
      if (active && payload && payload.length) {
        return (
          <div
            className="bg-white border rounded-lg"
            style={{ borderColor: baseColors.gray[200], padding: '0.75rem' }}
          >
            <p className="font-semibold mb-2" style={{ color: baseColors.gray[900] }}>
              {label}
            </p>
            {payload.map((entry, index: number) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3" style={{ backgroundColor: entry.color }} />
                <span style={{ color: baseColors.gray[600] }}>{entry.name}:</span>
                <span className="font-medium" style={{ color: baseColors.gray[900] }}>
                  {entry.value}
                  {activeChart === 'pie' ? '%' : activeChart === 'bar' ? ' chains' : 'B'}
                </span>
              </div>
            ))}
          </div>
        );
      }
      return null;
    };
    return TooltipComponent;
  }, [activeChart]);

  const renderTable = useCallback(() => {
    const data =
      activeChart === 'pie'
        ? marketShareData
        : activeChart === 'bar'
          ? chainSupportData
          : marketShareData;

    return (
      <div className="h-full overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0" style={{ backgroundColor: baseColors.gray[50] }}>
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: baseColors.gray[600] }}
              >
                {isChineseLocale(locale) ? '预言机' : 'Oracle'}
              </th>
              <th
                className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                style={{ color: baseColors.gray[600] }}
              >
                {activeChart === 'pie'
                  ? isChineseLocale(locale)
                    ? '市场份额'
                    : 'Market Share'
                  : activeChart === 'bar'
                    ? isChineseLocale(locale)
                      ? '支持链数'
                      : 'Chains'
                    : isChineseLocale(locale)
                      ? 'TVS'
                      : 'TVS'}
              </th>
              {activeChart === 'bar' && (
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ color: baseColors.gray[600] }}
                >
                  {isChineseLocale(locale) ? '协议数' : 'Protocols'}
                </th>
              )}
              {activeChart === 'pie' && (
                <th
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ color: baseColors.gray[600] }}
                >
                  {isChineseLocale(locale) ? 'TVS' : 'TVS'}
                </th>
              )}
            </tr>
          </thead>
          <tbody style={{ borderColor: baseColors.gray[100] }} className="divide-y">
            {data.map((item, _index: number) => (
              <tr
                key={item.name}
                className={`transition-colors cursor-pointer ${
                  selectedItem === item.name ? '' : ''
                }`}
                style={{
                  backgroundColor: selectedItem === item.name ? baseColors.gray[50] : 'transparent',
                }}
                onClick={() => setSelectedItem(item.name === selectedItem ? null : item.name)}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3" style={{ backgroundColor: item.color }} />
                    <span className="font-medium" style={{ color: baseColors.gray[900] }}>
                      {item.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold" style={{ color: baseColors.gray[900] }}>
                    {activeChart === 'pie' ? `${'value' in item ? item.value : 0}%` : item.chains}
                  </span>
                </td>
                {activeChart === 'bar' && (
                  <td className="px-4 py-3 text-right">
                    <span style={{ color: baseColors.gray[600] }}>
                      {'protocols' in item ? item.protocols : 0}
                    </span>
                  </td>
                )}
                {activeChart === 'pie' && (
                  <td className="px-4 py-3 text-right">
                    <span style={{ color: baseColors.gray[600] }}>
                      {'tvs' in item ? item.tvs : ''}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [activeChart, locale, selectedItem]);

  const renderChart = useCallback(() => {
    if (viewType === 'table') {
      return renderTable();
    }

    switch (activeChart) {
      case 'pie':
        return (
          <PieChart>
            <Pie
              data={marketShareData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomizedLabel}
              outerRadius={140}
              innerRadius={80}
              fill={chartColors.recharts.primary}
              dataKey="value"
              paddingAngle={2}
              onMouseEnter={(_, index) => setHoveredItem(marketShareData[index]?.name)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(_, index) =>
                setSelectedItem(
                  marketShareData[index]?.name === selectedItem
                    ? null
                    : marketShareData[index]?.name
                )
              }
            >
              {marketShareData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={selectedItem === entry.name ? baseColors.gray[50] : 'none'}
                  strokeWidth={selectedItem === entry.name ? 3 : 0}
                  opacity={hoveredItem && hoveredItem !== entry.name ? 0.6 : 1}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        );
      case 'trend':
        return (
          <LineChart data={tvsTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis dataKey="month" stroke={chartColors.recharts.axis} fontSize={12} />
            <YAxis stroke={chartColors.recharts.axis} fontSize={12} />
            <RechartsTooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={chartColors.recharts.grid} />
            <Line
              type="monotone"
              dataKey="chainlink"
              name="Chainlink"
              stroke={COLORS.chainlink}
              strokeWidth={hoveredItem === 'Chainlink' || !hoveredItem ? 3 : 2}
              dot={{ r: hoveredItem === 'Chainlink' ? 6 : 4, fill: COLORS.chainlink }}
              activeDot={{ r: 8 }}
              opacity={hoveredItem && hoveredItem !== 'Chainlink' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Chainlink')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="pyth"
              name="Pyth Network"
              stroke={COLORS.pyth}
              strokeWidth={hoveredItem === 'Pyth Network' || !hoveredItem ? 3 : 2}
              dot={{ r: hoveredItem === 'Pyth Network' ? 6 : 4, fill: COLORS.pyth }}
              activeDot={{ r: 8 }}
              opacity={hoveredItem && hoveredItem !== 'Pyth Network' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Pyth Network')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="band"
              name="Band Protocol"
              stroke={COLORS.band}
              strokeWidth={hoveredItem === 'Band Protocol' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'Band Protocol' ? 5 : 3, fill: COLORS.band }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'Band Protocol' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Band Protocol')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="api3"
              name="API3"
              stroke={COLORS.api3}
              strokeWidth={hoveredItem === 'API3' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'API3' ? 5 : 3, fill: COLORS.api3 }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'API3' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('API3')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="uma"
              name="UMA"
              stroke={COLORS.uma}
              strokeWidth={hoveredItem === 'UMA' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'UMA' ? 5 : 3, fill: COLORS.uma }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'UMA' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('UMA')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="redstone"
              name="RedStone"
              stroke={COLORS.redstone}
              strokeWidth={hoveredItem === 'RedStone' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'RedStone' ? 5 : 3, fill: COLORS.redstone }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'RedStone' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('RedStone')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="dia"
              name="DIA"
              stroke={COLORS.dia}
              strokeWidth={hoveredItem === 'DIA' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'DIA' ? 5 : 3, fill: COLORS.dia }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'DIA' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('DIA')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="tellor"
              name="Tellor"
              stroke={COLORS.tellor}
              strokeWidth={hoveredItem === 'Tellor' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'Tellor' ? 5 : 3, fill: COLORS.tellor }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'Tellor' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Tellor')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="chronicle"
              name="Chronicle"
              stroke={COLORS.chronicle}
              strokeWidth={hoveredItem === 'Chronicle' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'Chronicle' ? 5 : 3, fill: COLORS.chronicle }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'Chronicle' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('Chronicle')}
              onMouseLeave={() => setHoveredItem(null)}
            />
            <Line
              type="monotone"
              dataKey="winklink"
              name="WINkLink"
              stroke={COLORS.winklink}
              strokeWidth={hoveredItem === 'WINkLink' || !hoveredItem ? 2 : 1.5}
              dot={{ r: hoveredItem === 'WINkLink' ? 5 : 3, fill: COLORS.winklink }}
              activeDot={{ r: 7 }}
              opacity={hoveredItem && hoveredItem !== 'WINkLink' ? 0.4 : 1}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredItem('WINkLink')}
              onMouseLeave={() => setHoveredItem(null)}
            />
          </LineChart>
        );
      case 'bar':
        return (
          <BarChart data={chainSupportData} layout="vertical">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              horizontal={false}
            />
            <XAxis type="number" stroke={chartColors.recharts.axis} fontSize={12} />
            <YAxis
              dataKey="name"
              type="category"
              stroke={chartColors.recharts.axis}
              fontSize={12}
              width={100}
            />
            <RechartsTooltip content={<CustomTooltip />} />
            <Bar
              dataKey="chains"
              name="Supported Chains"
              onMouseEnter={(_, index) => setHoveredItem(chainSupportData[index]?.name)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={(_, index) =>
                setSelectedItem(
                  chainSupportData[index]?.name === selectedItem
                    ? null
                    : chainSupportData[index]?.name
                )
              }
            >
              {chainSupportData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={hoveredItem && hoveredItem !== entry.name ? 0.5 : 1}
                  stroke={selectedItem === entry.name ? entry.color : 'none'}
                  strokeWidth={selectedItem === entry.name ? 2 : 0}
                  style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                />
              ))}
            </Bar>
          </BarChart>
        );
      default:
        return null;
    }
  }, [
    viewType,
    activeChart,
    hoveredItem,
    selectedItem,
    renderCustomizedLabel,
    CustomTooltip,
    renderTable,
  ]);

  const getChartTitle = useCallback(() => {
    switch (activeChart) {
      case 'pie':
        return isChineseLocale(locale) ? '市场份额分布' : 'Market Share Distribution';
      case 'trend':
        return isChineseLocale(locale) ? 'TVS 趋势分析' : 'TVS Trend Analysis';
      case 'bar':
        return isChineseLocale(locale) ? '链支持情况' : 'Chain Support Overview';
      default:
        return '';
    }
  }, [activeChart, locale]);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-4"
              style={{
                backgroundColor: baseColors.gray[100],
                border: `1px solid ${baseColors.gray[200]}`,
              }}
            >
              <PieChartIcon className="w-4 h-4" style={{ color: baseColors.gray[600] }} />
              <span className="text-sm font-medium" style={{ color: baseColors.gray[600] }}>
                {isChineseLocale(locale) ? '市场概览' : 'Market Overview'}
              </span>
            </div>
            <h2
              className="text-3xl md:text-4xl font-bold mb-4"
              style={{ color: baseColors.gray[900] }}
            >
              {isChineseLocale(locale) ? '预言机市场分析' : 'Oracle Market Analysis'}
            </h2>
            <p className="text-lg max-w-2xl" style={{ color: baseColors.gray[600] }}>
              {isChineseLocale(locale)
                ? '全面分析预言机市场份额、TVS趋势和链支持情况'
                : 'Comprehensive analysis of oracle market share, TVS trends and chain support'}
            </p>
          </div>

          <div
            className="flex items-center gap-1 p-1 overflow-x-auto max-w-full"
            style={{ backgroundColor: baseColors.gray[100] }}
          >
            {timeRanges.map((range) => (
              <button
                key={range.key}
                onClick={() => setSelectedRange(range.key)}
                className={`px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap border rounded-md ${
                  selectedRange === range.key ? 'bg-white border-gray-300' : 'border-transparent'
                }`}
                style={{
                  color: selectedRange === range.key ? baseColors.gray[900] : baseColors.gray[600],
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div
            className="bg-white border p-4 h-full flex flex-col justify-center transition-colors rounded-lg"
            style={{ borderColor: baseColors.gray[200] }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2" style={{ backgroundColor: baseColors.gray[100] }}>
                <DollarSign className="w-4 h-4" style={{ color: baseColors.gray[600] }} />
              </div>
              <span className="text-sm" style={{ color: baseColors.gray[500] }}>
                {isChineseLocale(locale) ? '总 TVS' : 'Total TVS'}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.totalTVS}
            </div>
            <div
              className="text-xs mt-1 flex items-center gap-1"
              style={{ color: semanticColors.success.main }}
            >
              <TrendingUp className="w-3 h-3" />
              +12.5%
            </div>
          </div>

          <div
            className="bg-white border p-4 h-full flex flex-col justify-center transition-colors rounded-lg"
            style={{ borderColor: baseColors.gray[200] }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2" style={{ backgroundColor: baseColors.gray[100] }}>
                <Globe className="w-4 h-4" style={{ color: baseColors.gray[600] }} />
              </div>
              <span className="text-sm" style={{ color: baseColors.gray[500] }}>
                {isChineseLocale(locale) ? '支持链数' : 'Total Chains'}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.totalChains}
            </div>
            <div className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {isChineseLocale(locale) ? '跨链覆盖' : 'Cross-chain'}
            </div>
          </div>

          <div
            className="bg-white border p-4 h-full flex flex-col justify-center transition-colors rounded-lg"
            style={{ borderColor: baseColors.gray[200] }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2" style={{ backgroundColor: baseColors.gray[100] }}>
                <Layers className="w-4 h-4" style={{ color: baseColors.gray[600] }} />
              </div>
              <span className="text-sm" style={{ color: baseColors.gray[500] }}>
                {isChineseLocale(locale) ? '协议数量' : 'Protocols'}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.totalProtocols}+
            </div>
            <div className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {isChineseLocale(locale) ? '集成项目' : 'Integrations'}
            </div>
          </div>

          <div
            className="bg-white border p-4 h-full flex flex-col justify-center transition-colors rounded-lg"
            style={{ borderColor: baseColors.gray[200] }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2" style={{ backgroundColor: baseColors.gray[100] }}>
                <Activity className="w-4 h-4" style={{ color: baseColors.gray[600] }} />
              </div>
              <span className="text-sm" style={{ color: baseColors.gray[500] }}>
                {isChineseLocale(locale) ? '市场主导' : 'Dominance'}
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.avgDominance}
            </div>
            <div className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {isChineseLocale(locale) ? 'Chainlink 份额' : 'Chainlink Share'}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveChart('pie')}
              className={`flex items-center gap-2 px-4 py-2 transition-colors border rounded-md ${
                activeChart === 'pie'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white hover:border-gray-400'
              }`}
              style={{
                color: activeChart === 'pie' ? baseColors.gray[50] : baseColors.gray[600],
                borderColor: activeChart === 'pie' ? baseColors.gray[900] : baseColors.gray[200],
              }}
            >
              <PieChartIcon className="w-4 h-4" />
              {isChineseLocale(locale) ? '市场份额' : 'Market Share'}
            </button>
            <button
              onClick={() => setActiveChart('trend')}
              className={`flex items-center gap-2 px-4 py-2 transition-colors border rounded-md ${
                activeChart === 'trend'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white hover:border-gray-400'
              }`}
              style={{
                color: activeChart === 'trend' ? baseColors.gray[50] : baseColors.gray[600],
                borderColor: activeChart === 'trend' ? baseColors.gray[900] : baseColors.gray[200],
              }}
            >
              <TrendingUp className="w-4 h-4" />
              {isChineseLocale(locale) ? 'TVS趋势' : 'TVS Trend'}
            </button>
            <button
              onClick={() => setActiveChart('bar')}
              className={`flex items-center gap-2 px-4 py-2 transition-colors border rounded-md ${
                activeChart === 'bar'
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white hover:border-gray-400'
              }`}
              style={{
                color: activeChart === 'bar' ? baseColors.gray[50] : baseColors.gray[600],
                borderColor: activeChart === 'bar' ? baseColors.gray[900] : baseColors.gray[200],
              }}
            >
              <BarChart3 className="w-4 h-4" />
              {isChineseLocale(locale) ? '链支持' : 'Chain Support'}
            </button>
          </div>

          <div
            className="flex items-center gap-1 p-1"
            style={{ backgroundColor: baseColors.gray[100] }}
          >
            <button
              onClick={() => setViewType('chart')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewType === 'chart' ? 'bg-white border' : ''
              }`}
              style={{
                color: viewType === 'chart' ? baseColors.gray[900] : baseColors.gray[600],
                borderColor: viewType === 'chart' ? baseColors.gray[200] : 'transparent',
              }}
            >
              <PieChartIcon className="w-4 h-4" />
              {isChineseLocale(locale) ? '图表' : 'Chart'}
            </button>
            <button
              onClick={() => setViewType('table')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors ${
                viewType === 'table' ? 'bg-white border' : ''
              }`}
              style={{
                color: viewType === 'table' ? baseColors.gray[900] : baseColors.gray[600],
                borderColor: viewType === 'table' ? baseColors.gray[200] : 'transparent',
              }}
            >
              <TableIcon className="w-4 h-4" />
              {isChineseLocale(locale) ? '表格' : 'Table'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: baseColors.gray[900] }}>
                {getChartTitle()}
              </h3>
              {selectedItem && !isLoading && (
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-sm flex items-center gap-1 hover:opacity-80"
                  style={{ color: baseColors.gray[600] }}
                >
                  {isChineseLocale(locale) ? '清除选择' : 'Clear Selection'}
                  <ChevronRight className="w-4 h-4 rotate-90" />
                </button>
              )}
            </div>
            <div className={`${viewType === 'table' ? 'h-[360px]' : 'h-[400px]'}`}>
              {isLoading ? (
                <ChartSkeleton
                  height={viewType === 'table' ? 360 : 400}
                  variant={activeChart === 'pie' ? 'area' : activeChart === 'bar' ? 'bar' : 'price'}
                  showToolbar={false}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart()}
                </ResponsiveContainer>
              )}
            </div>
            {!isLoading && viewType === 'chart' && (
              <div
                className="mt-4 flex items-center gap-2 text-xs"
                style={{ color: baseColors.gray[500] }}
              >
                <Info className="w-4 h-4" />
                {isChineseLocale(locale)
                  ? '悬停查看详情，点击选中项目'
                  : 'Hover for details, click to select'}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div
              className="p-4"
              style={{ backgroundColor: baseColors.gray[900], color: baseColors.gray[50] }}
            >
              <div className="text-sm mb-1" style={{ color: baseColors.gray[300] }}>
                {isChineseLocale(locale) ? '选中时间范围' : 'Selected Time Range'}
              </div>
              <div className="text-2xl font-bold">{selectedRange}</div>
              <div className="text-xs mt-1" style={{ color: baseColors.gray[400] }}>
                {isChineseLocale(locale) ? '数据已更新' : 'Data updated'}
              </div>
            </div>

            <div className="bg-white border rounded-lg" style={{ borderColor: baseColors.gray[200] }}>
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: baseColors.gray[200], backgroundColor: baseColors.gray[50] }}
              >
                <span className="text-sm font-medium" style={{ color: baseColors.gray[700] }}>
                  {isChineseLocale(locale) ? '预言机排名' : 'Oracle Rankings'}
                </span>
                <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {isChineseLocale(locale) ? 'TVS / 份额' : 'TVS / Share'}
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-100">
                {marketShareData.map((item, index) => (
                  <OraclePrefetchCard
                    key={item.name}
                    name={item.name}
                    value={item.value}
                    color={item.color}
                    tvs={item.tvs}
                    chains={item.chains}
                    index={index}
                    isSelected={selectedItem === item.name}
                    isHovered={hoveredItem === item.name}
                    onSelect={(name) => setSelectedItem(name === selectedItem ? null : name)}
                    onHover={setHoveredItem}
                  />
                ))}
              </div>
            </div>

            <div
              className="border p-3 rounded-lg"
              style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs mb-0.5" style={{ color: baseColors.gray[500] }}>
                    {isChineseLocale(locale) ? '总市场份额' : 'Total Market Share'}
                  </div>
                  <div className="text-xl font-bold" style={{ color: baseColors.gray[900] }}>
                    100%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: baseColors.gray[500] }}>
                    {isChineseLocale(locale) ? '覆盖预言机' : 'Oracles Covered'}
                  </div>
                  <div className="text-xl font-bold" style={{ color: baseColors.gray[900] }}>
                    {stats.oracleCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const OracleMarketOverview = memo(OracleMarketOverviewBase);

export default OracleMarketOverview;
