'use client';

import { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';

import {
  PieChart as PieChartIcon,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  Activity,
  DollarSign,
  Layers,
  Globe,
  ChevronRight,
  Info,
  AlertTriangle,
  Database,
  Download,
  Keyboard,
} from 'lucide-react';
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

import {
  DataExportButton,
  type ExportDataRow,
  type ExportColumn,
} from '@/components/oracle/forms/DataExportButton';
import { useShortcutHelp } from '@/components/shortcuts';
import { ChartSkeleton } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { type TooltipProps, type CustomLabelProps } from '@/types/ui/recharts';

import KeyboardShortcuts from './KeyboardShortcuts';
import OraclePrefetchCard from './OraclePrefetchCard';
import useMarketOverviewKeyboard, {
  type ChartType,
  type ViewType,
} from './useMarketOverviewKeyboard';

function useResponsiveChart() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    chartFontSize: isMobile ? 10 : 12,
    pieOuterRadius: isMobile ? 100 : isTablet ? 120 : 140,
    pieInnerRadius: isMobile ? 55 : isTablet ? 70 : 80,
    yAxisWidth: isMobile ? 70 : 100,
  };
}

function MobileTimeRangeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ key: string; label: string }>;
}) {
  return (
    <div className="md:hidden">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="选择时间范围"
        className="w-full px-4 py-2.5 text-sm font-medium border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        style={{
          backgroundColor: baseColors.gray[50],
          borderColor: baseColors.gray[200],
          color: baseColors.gray[900],
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='${encodeURIComponent(baseColors.gray[500])}'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.25rem',
          paddingRight: '2.5rem',
        }}
      >
        {options.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

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

const oracleLineConfig = [
  { dataKey: 'chainlink', name: 'Chainlink', stroke: COLORS.chainlink },
  { dataKey: 'pyth', name: 'Pyth Network', stroke: COLORS.pyth },
  { dataKey: 'band', name: 'Band Protocol', stroke: COLORS.band },
  { dataKey: 'api3', name: 'API3', stroke: COLORS.api3 },
  { dataKey: 'uma', name: 'UMA', stroke: COLORS.uma },
  { dataKey: 'redstone', name: 'RedStone', stroke: COLORS.redstone },
  { dataKey: 'dia', name: 'DIA', stroke: COLORS.dia },
  { dataKey: 'tellor', name: 'Tellor', stroke: COLORS.tellor },
  { dataKey: 'chronicle', name: 'Chronicle', stroke: COLORS.chronicle },
  { dataKey: 'winklink', name: 'WINkLink', stroke: COLORS.winklink },
];

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

const tvsTrendDataByRange: Record<
  string,
  Array<{
    time: string;
    chainlink: number;
    pyth: number;
    band: number;
    api3: number;
    uma: number;
    redstone: number;
    dia: number;
    tellor: number;
    chronicle: number;
    winklink: number;
  }>
> = {
  '1H': [
    {
      time: '00:00',
      chainlink: 41.8,
      pyth: 14.9,
      band: 3.95,
      api3: 3.45,
      uma: 2.48,
      redstone: 2.08,
      dia: 1.58,
      tellor: 1.28,
      chronicle: 0.98,
      winklink: 0.68,
    },
    {
      time: '00:10',
      chainlink: 41.9,
      pyth: 14.95,
      band: 3.97,
      api3: 3.47,
      uma: 2.49,
      redstone: 2.09,
      dia: 1.59,
      tellor: 1.29,
      chronicle: 0.99,
      winklink: 0.69,
    },
    {
      time: '00:20',
      chainlink: 42.0,
      pyth: 14.98,
      band: 3.98,
      api3: 3.48,
      uma: 2.49,
      redstone: 2.09,
      dia: 1.59,
      tellor: 1.29,
      chronicle: 0.99,
      winklink: 0.69,
    },
    {
      time: '00:30',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
    {
      time: '00:40',
      chainlink: 42.2,
      pyth: 15.02,
      band: 4.01,
      api3: 3.51,
      uma: 2.51,
      redstone: 2.11,
      dia: 1.61,
      tellor: 1.31,
      chronicle: 1.01,
      winklink: 0.71,
    },
    {
      time: '00:50',
      chainlink: 42.15,
      pyth: 15.01,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
  '24H': [
    {
      time: '00:00',
      chainlink: 41.5,
      pyth: 14.8,
      band: 3.9,
      api3: 3.4,
      uma: 2.45,
      redstone: 2.05,
      dia: 1.55,
      tellor: 1.25,
      chronicle: 0.95,
      winklink: 0.65,
    },
    {
      time: '04:00',
      chainlink: 41.6,
      pyth: 14.85,
      band: 3.92,
      api3: 3.42,
      uma: 2.46,
      redstone: 2.06,
      dia: 1.56,
      tellor: 1.26,
      chronicle: 0.96,
      winklink: 0.66,
    },
    {
      time: '08:00',
      chainlink: 41.7,
      pyth: 14.9,
      band: 3.95,
      api3: 3.45,
      uma: 2.47,
      redstone: 2.07,
      dia: 1.57,
      tellor: 1.27,
      chronicle: 0.97,
      winklink: 0.67,
    },
    {
      time: '12:00',
      chainlink: 41.9,
      pyth: 14.95,
      band: 3.98,
      api3: 3.48,
      uma: 2.49,
      redstone: 2.09,
      dia: 1.59,
      tellor: 1.29,
      chronicle: 0.99,
      winklink: 0.69,
    },
    {
      time: '16:00',
      chainlink: 42.0,
      pyth: 14.98,
      band: 3.99,
      api3: 3.49,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
    {
      time: '20:00',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
  '7D': [
    {
      time: 'Mon',
      chainlink: 41.0,
      pyth: 14.5,
      band: 3.8,
      api3: 3.3,
      uma: 2.4,
      redstone: 2.0,
      dia: 1.5,
      tellor: 1.2,
      chronicle: 0.9,
      winklink: 0.6,
    },
    {
      time: 'Tue',
      chainlink: 41.3,
      pyth: 14.7,
      band: 3.85,
      api3: 3.35,
      uma: 2.42,
      redstone: 2.03,
      dia: 1.53,
      tellor: 1.23,
      chronicle: 0.93,
      winklink: 0.63,
    },
    {
      time: 'Wed',
      chainlink: 41.5,
      pyth: 14.8,
      band: 3.9,
      api3: 3.4,
      uma: 2.45,
      redstone: 2.05,
      dia: 1.55,
      tellor: 1.25,
      chronicle: 0.95,
      winklink: 0.65,
    },
    {
      time: 'Thu',
      chainlink: 41.7,
      pyth: 14.9,
      band: 3.95,
      api3: 3.45,
      uma: 2.47,
      redstone: 2.07,
      dia: 1.57,
      tellor: 1.27,
      chronicle: 0.97,
      winklink: 0.67,
    },
    {
      time: 'Fri',
      chainlink: 41.9,
      pyth: 14.95,
      band: 3.98,
      api3: 3.48,
      uma: 2.49,
      redstone: 2.09,
      dia: 1.59,
      tellor: 1.29,
      chronicle: 0.99,
      winklink: 0.69,
    },
    {
      time: 'Sat',
      chainlink: 42.0,
      pyth: 14.98,
      band: 3.99,
      api3: 3.49,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
    {
      time: 'Sun',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
  '30D': [
    {
      time: 'Week 1',
      chainlink: 40.0,
      pyth: 14.0,
      band: 3.7,
      api3: 3.2,
      uma: 2.3,
      redstone: 1.9,
      dia: 1.4,
      tellor: 1.1,
      chronicle: 0.85,
      winklink: 0.55,
    },
    {
      time: 'Week 2',
      chainlink: 40.5,
      pyth: 14.3,
      band: 3.8,
      api3: 3.3,
      uma: 2.35,
      redstone: 1.95,
      dia: 1.45,
      tellor: 1.15,
      chronicle: 0.9,
      winklink: 0.6,
    },
    {
      time: 'Week 3',
      chainlink: 41.0,
      pyth: 14.6,
      band: 3.9,
      api3: 3.4,
      uma: 2.4,
      redstone: 2.0,
      dia: 1.5,
      tellor: 1.2,
      chronicle: 0.95,
      winklink: 0.65,
    },
    {
      time: 'Week 4',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
  '90D': [
    {
      time: 'Month 1',
      chainlink: 38.0,
      pyth: 13.0,
      band: 3.5,
      api3: 3.0,
      uma: 2.1,
      redstone: 1.7,
      dia: 1.3,
      tellor: 1.0,
      chronicle: 0.75,
      winklink: 0.5,
    },
    {
      time: 'Month 2',
      chainlink: 40.0,
      pyth: 14.0,
      band: 3.7,
      api3: 3.2,
      uma: 2.3,
      redstone: 1.9,
      dia: 1.4,
      tellor: 1.1,
      chronicle: 0.85,
      winklink: 0.55,
    },
    {
      time: 'Month 3',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
  '1Y': [
    {
      time: 'Q1',
      chainlink: 32.0,
      pyth: 7.0,
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
      time: 'Q2',
      chainlink: 35.0,
      pyth: 8.0,
      band: 3.5,
      api3: 2.8,
      uma: 2.0,
      redstone: 1.6,
      dia: 1.2,
      tellor: 0.85,
      chronicle: 0.65,
      winklink: 0.47,
    },
    {
      time: 'Q3',
      chainlink: 38.0,
      pyth: 10.0,
      band: 3.6,
      api3: 3.0,
      uma: 2.1,
      redstone: 1.8,
      dia: 1.3,
      tellor: 0.9,
      chronicle: 0.7,
      winklink: 0.48,
    },
    {
      time: 'Q4',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
  ALL: [
    {
      time: '2021',
      chainlink: 20.0,
      pyth: 2.0,
      band: 2.5,
      api3: 1.5,
      uma: 1.0,
      redstone: 0.5,
      dia: 0.5,
      tellor: 0.4,
      chronicle: 0.3,
      winklink: 0.2,
    },
    {
      time: '2022',
      chainlink: 25.0,
      pyth: 4.0,
      band: 2.8,
      api3: 2.0,
      uma: 1.3,
      redstone: 0.8,
      dia: 0.7,
      tellor: 0.5,
      chronicle: 0.4,
      winklink: 0.3,
    },
    {
      time: '2023',
      chainlink: 32.0,
      pyth: 7.0,
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
      time: '2024',
      chainlink: 42.1,
      pyth: 15.0,
      band: 4.0,
      api3: 3.5,
      uma: 2.5,
      redstone: 2.1,
      dia: 1.6,
      tellor: 1.3,
      chronicle: 1.0,
      winklink: 0.7,
    },
  ],
};

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

interface BaseDataItem {
  name: string;
  color: string;
}

interface MarketShareDataItem extends BaseDataItem {
  value: number;
  tvs: string;
  chains: number;
}

interface ChainSupportDataItem extends BaseDataItem {
  chains: number;
  protocols: number;
}

type TableDataItem = MarketShareDataItem | ChainSupportDataItem;

function isMarketShareDataItem(item: TableDataItem): item is MarketShareDataItem {
  return 'value' in item && 'tvs' in item;
}

function isChainSupportDataItem(item: TableDataItem): item is ChainSupportDataItem {
  return 'protocols' in item;
}

function OracleMarketOverviewBase() {
  const t = useTranslations('ui.marketOverview');
  const [selectedRange, setSelectedRange] = useState('30D');
  const [activeChart, setActiveChart] = useState<ChartType>('pie');
  const [viewType, setViewType] = useState<ViewType>('chart');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRangeChanging, setIsRangeChanging] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const responsive = useResponsiveChart();
  const { toggle: toggleHelp } = useShortcutHelp();

  const { chartTypeButtonRefs, timeRangeButtonRefs, viewTypeButtonRefs } =
    useMarketOverviewKeyboard({
      activeChart,
      setActiveChart,
      viewType,
      setViewType,
      selectedRange,
      setSelectedRange,
      onRefresh: () => {
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 800);
      },
      onExport: () => {
        const exportButton = document.querySelector('[data-export-button]') as HTMLButtonElement;
        exportButton?.click();
      },
    });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isRangeChanging) {
      const timer = setTimeout(() => {
        setIsRangeChanging(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRangeChanging]);

  const handleRangeChange = useCallback((range: string) => {
    setSelectedRange(range);
    setIsRangeChanging(true);
  }, []);

  const currentTrendData = useMemo(() => {
    return tvsTrendDataByRange[selectedRange] || tvsTrendDataByRange['30D'];
  }, [selectedRange]);

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

  const exportColumns: ExportColumn[] = useMemo(() => {
    if (activeChart === 'pie') {
      return [
        { key: 'name', label: t('exportColumns.oracle') },
        { key: 'value', label: t('exportColumns.marketShare') },
        { key: 'tvs', label: t('exportColumns.tvs') },
        { key: 'chains', label: t('exportColumns.chains') },
      ];
    } else if (activeChart === 'bar') {
      return [
        { key: 'name', label: t('exportColumns.oracle') },
        { key: 'chains', label: t('exportColumns.chains') },
        { key: 'protocols', label: t('exportColumns.protocols') },
      ];
    } else {
      return [
        { key: 'time', label: t('exportColumns.time') },
        ...oracleLineConfig.map((config) => ({
          key: config.dataKey,
          label: config.name,
        })),
      ];
    }
  }, [activeChart, t]);

  const exportData: ExportDataRow[] = useMemo(() => {
    if (activeChart === 'pie') {
      return marketShareData.map((item) => ({
        name: item.name,
        value: `${item.value}%`,
        tvs: item.tvs,
        chains: item.chains,
      }));
    } else if (activeChart === 'bar') {
      return chainSupportData.map((item) => ({
        name: item.name,
        chains: item.chains,
        protocols: item.protocols,
      }));
    } else {
      return currentTrendData.map((item) => ({
        time: item.time,
        chainlink: `$${item.chainlink}B`,
        pyth: `$${item.pyth}B`,
        band: `$${item.band}B`,
        api3: `$${item.api3}B`,
        uma: `$${item.uma}B`,
        redstone: `$${item.redstone}B`,
        dia: `$${item.dia}B`,
        tellor: `$${item.tellor}B`,
        chronicle: `$${item.chronicle}B`,
        winklink: `$${item.winklink}B`,
      }));
    }
  }, [activeChart, currentTrendData]);

  const fullExportData: ExportDataRow[] = useMemo(() => {
    const timestamp = new Date().toISOString();
    const baseData = {
      exportTime: timestamp,
      timeRange: selectedRange,
      chartType: activeChart,
    };

    const statsData = {
      totalTVS: stats.totalTVS,
      totalChains: stats.totalChains,
      totalProtocols: stats.totalProtocols,
      avgDominance: stats.avgDominance,
      oracleCount: stats.oracleCount,
    };

    if (activeChart === 'pie') {
      return [
        { ...baseData, ...statsData, type: 'marketShare' },
        {},
        { section: t('exportSections.marketShareData') },
        ...marketShareData.map((item) => ({
          name: item.name,
          marketShare: `${item.value}%`,
          tvs: item.tvs,
          chains: item.chains,
        })),
        {},
        { section: t('exportSections.chainSupportData') },
        ...chainSupportData.map((item) => ({
          name: item.name,
          chains: item.chains,
          protocols: item.protocols,
        })),
      ];
    } else if (activeChart === 'bar') {
      return [
        { ...baseData, ...statsData, type: 'chainSupport' },
        {},
        { section: t('exportSections.chainSupportData') },
        ...chainSupportData.map((item) => ({
          name: item.name,
          chains: item.chains,
          protocols: item.protocols,
        })),
      ];
    } else {
      return [
        { ...baseData, ...statsData, type: 'tvsTrend' },
        {},
        { section: t('exportSections.tvsTrendData') },
        ...currentTrendData.map((item) => ({
          time: item.time,
          chainlink: item.chainlink,
          pyth: item.pyth,
          band: item.band,
          api3: item.api3,
          uma: item.uma,
          redstone: item.redstone,
          dia: item.dia,
          tellor: item.tellor,
          chronicle: item.chronicle,
          winklink: item.winklink,
        })),
      ];
    }
  }, [activeChart, currentTrendData, selectedRange, stats, t]);

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
          className="text-xs font-normal"
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
    if (activeChart === 'trend') {
      return (
        <div className="h-full overflow-auto">
          <div className="min-w-[800px]">
            <table className="w-full">
              <thead className="sticky top-0" style={{ backgroundColor: baseColors.gray[50] }}>
                <tr>
                  <th
                    className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: baseColors.gray[600] }}
                  >
                    {t('time')}
                  </th>
                  {oracleLineConfig.map((config) => (
                    <th
                      key={config.dataKey}
                      className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold uppercase tracking-wider"
                      style={{ color: baseColors.gray[600] }}
                    >
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <div className="w-2 h-2" style={{ backgroundColor: config.stroke }} />
                        <span className="hidden sm:inline">{config.name}</span>
                        <span className="sm:hidden">
                          {config.dataKey.slice(0, 3).toUpperCase()}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ borderColor: baseColors.gray[100] }} className="divide-y">
                {currentTrendData.map((item, index: number) => (
                  <tr
                    key={`${item.time}-${index}`}
                    className="transition-colors hover:bg-gray-50"
                    style={{
                      backgroundColor:
                        hoveredItem === item.time ? baseColors.gray[50] : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredItem(item.time)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                      <span className="font-medium text-sm" style={{ color: baseColors.gray[900] }}>
                        {item.time}
                      </span>
                    </td>
                    {oracleLineConfig.map((config) => (
                      <td key={config.dataKey} className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                        <span className="text-sm" style={{ color: baseColors.gray[600] }}>
                          ${item[config.dataKey as keyof typeof item]}B
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    const data: TableDataItem[] =
      activeChart === 'pie'
        ? marketShareData
        : activeChart === 'bar'
          ? chainSupportData
          : marketShareData;

    return (
      <div className="h-full overflow-auto">
        <div className="min-w-[500px]">
          <table className="w-full">
            <thead className="sticky top-0" style={{ backgroundColor: baseColors.gray[50] }}>
              <tr>
                <th
                  className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: baseColors.gray[600] }}
                >
                  {t('oracle')}
                </th>
                <th
                  className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold uppercase tracking-wider"
                  style={{ color: baseColors.gray[600] }}
                >
                  {activeChart === 'pie'
                    ? t('marketShare')
                    : activeChart === 'bar'
                      ? t('chains')
                      : 'TVS'}
                </th>
                {activeChart === 'bar' && (
                  <th
                    className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold uppercase tracking-wider"
                    style={{ color: baseColors.gray[600] }}
                  >
                    {t('protocols')}
                  </th>
                )}
                {activeChart === 'pie' && (
                  <th
                    className="px-3 sm:px-4 py-2 sm:py-3 text-right text-xs font-semibold uppercase tracking-wider"
                    style={{ color: baseColors.gray[600] }}
                  >
                    TVS
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
                    backgroundColor:
                      selectedItem === item.name ? baseColors.gray[50] : 'transparent',
                  }}
                  onClick={() => setSelectedItem(item.name === selectedItem ? null : item.name)}
                  onMouseEnter={() => setHoveredItem(item.name)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <td className="px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-sm" style={{ color: baseColors.gray[900] }}>
                        {item.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                    <span className="font-semibold text-sm" style={{ color: baseColors.gray[900] }}>
                      {isMarketShareDataItem(item) ? `${item.value}%` : item.chains}
                    </span>
                  </td>
                  {activeChart === 'bar' && (
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                      <span className="text-sm" style={{ color: baseColors.gray[600] }}>
                        {isChainSupportDataItem(item) ? item.protocols : 0}
                      </span>
                    </td>
                  )}
                  {activeChart === 'pie' && (
                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-right">
                      <span className="text-sm" style={{ color: baseColors.gray[600] }}>
                        {isMarketShareDataItem(item) ? item.tvs : ''}
                      </span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [activeChart, selectedItem, currentTrendData, hoveredItem, t]);

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
              outerRadius={responsive.pieOuterRadius}
              innerRadius={responsive.pieInnerRadius}
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
                  strokeWidth={selectedItem === entry.name ? 2 : 0}
                  opacity={hoveredItem && hoveredItem !== entry.name ? 0.6 : 1}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    filter: selectedItem === entry.name ? 'brightness(1.1)' : 'none',
                  }}
                />
              ))}
            </Pie>
            <RechartsTooltip content={<CustomTooltip />} />
          </PieChart>
        );
      case 'trend':
        return (
          <LineChart data={currentTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis
              dataKey="time"
              stroke={chartColors.recharts.axis}
              fontSize={responsive.chartFontSize}
            />
            <YAxis stroke={chartColors.recharts.axis} fontSize={responsive.chartFontSize} />
            <RechartsTooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={chartColors.recharts.grid} />
            {oracleLineConfig.map((config) => (
              <Line
                key={config.dataKey}
                type="monotone"
                dataKey={config.dataKey}
                name={config.name}
                stroke={config.stroke}
                strokeWidth={responsive.isMobile ? 1.5 : 2}
                dot={false}
                activeDot={{ r: responsive.isMobile ? 4 : 6, fill: config.stroke }}
                opacity={hoveredItem && hoveredItem !== config.name ? 0.4 : 1}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredItem(config.name)}
                onMouseLeave={() => setHoveredItem(null)}
              />
            ))}
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
            <XAxis
              type="number"
              stroke={chartColors.recharts.axis}
              fontSize={responsive.chartFontSize}
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke={chartColors.recharts.axis}
              fontSize={responsive.chartFontSize}
              width={responsive.yAxisWidth}
              tick={{ fontSize: responsive.chartFontSize }}
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
    currentTrendData,
    responsive,
  ]);

  const getChartTitle = useCallback(() => {
    switch (activeChart) {
      case 'pie':
        return t('marketShareDistribution');
      case 'trend':
        return t('tvsTrendAnalysis');
      case 'bar':
        return t('chainSupportOverview');
      default:
        return '';
    }
  }, [activeChart, t]);

  const generateChartAriaLabel = useCallback(() => {
    const chartType =
      activeChart === 'pie' ? '饼图' : activeChart === 'trend' ? '趋势图' : '柱状图';
    const timeRange = selectedRange;

    if (activeChart === 'pie') {
      const topOracle = marketShareData[0];
      return `${chartType}，显示预言机市场份额分布。${topOracle.name} 占据最大份额 ${topOracle.value}%，总 TVS ${topOracle.tvs}。时间范围：${timeRange}`;
    } else if (activeChart === 'trend') {
      return `${chartType}，显示各预言机 TVS 趋势变化。时间范围：${timeRange}。包含 Chainlink、Pyth、Band Protocol 等主要预言机的数据。`;
    } else {
      const topChain = chainSupportData[0];
      return `${chartType}，显示预言机链支持情况。${topChain.name} 支持最多 ${topChain.chains} 条链和 ${topChain.protocols} 个协议。`;
    }
  }, [activeChart, selectedRange]);

  return (
    <section
      className="py-10 sm:py-16 lg:py-20 bg-white"
      aria-labelledby="oracle-market-title"
      role="region"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-4 sm:gap-6">
          <div>
            <div
              className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 mb-3 sm:mb-4"
              style={{
                backgroundColor: baseColors.gray[100],
                border: `1px solid ${baseColors.gray[200]}`,
              }}
            >
              <PieChartIcon
                className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                style={{ color: baseColors.gray[600] }}
              />
              <span
                className="text-xs sm:text-sm font-medium"
                style={{ color: baseColors.gray[600] }}
              >
                {t('title')}
              </span>
            </div>
            <h2
              id="oracle-market-title"
              className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4"
              style={{ color: baseColors.gray[900] }}
            >
              {t('oracleMarketAnalysis')}
              <span
                className="ml-2 sm:ml-3 inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold rounded-full"
                style={{
                  backgroundColor: semanticColors.warning.light,
                  color: semanticColors.warning.dark,
                }}
                aria-label="模拟数据标识"
              >
                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">{t('simulatedBadge')}</span>
              </span>
            </h2>
            <p
              className="text-sm sm:text-base lg:text-lg max-w-2xl"
              style={{ color: baseColors.gray[600] }}
            >
              {t('analysisDescription')}
            </p>
          </div>

          <MobileTimeRangeSelect
            value={selectedRange}
            onChange={handleRangeChange}
            options={timeRanges}
          />

          <div
            className="hidden md:flex items-center gap-1 p-1 overflow-x-auto max-w-full rounded-md"
            style={{ backgroundColor: baseColors.gray[100] }}
            role="tablist"
            aria-label="时间范围选择"
          >
            {timeRanges.map((range) => {
              const isSelected = selectedRange === range.key;
              return (
                <button
                  key={range.key}
                  ref={(el) => {
                    if (el) timeRangeButtonRefs.current[range.key] = el;
                  }}
                  onClick={() => handleRangeChange(range.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleRangeChange(range.key);
                    }
                  }}
                  role="tab"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  aria-controls="chart-panel"
                  className={`px-3 py-2 text-sm font-medium transition-all whitespace-nowrap border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'bg-white border-gray-300 shadow-sm'
                      : 'border-transparent hover:bg-gray-200/50'
                  }`}
                  style={{
                    color: isSelected ? baseColors.gray[900] : baseColors.gray[600],
                  }}
                >
                  {range.label}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8"
          role="region"
          aria-label="市场统计概览"
        >
          <div
            className="bg-white border p-3 sm:p-4 h-full flex flex-col justify-center transition-colors rounded-lg shadow-sm"
            style={{ borderColor: baseColors.gray[200] }}
            role="article"
            aria-label={`总 TVS: ${stats.totalTVS}, 增长 12.5%`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded">
                <DollarSign
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  style={{ color: baseColors.gray[600] }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs sm:text-sm" style={{ color: baseColors.gray[500] }}>
                {t('totalTVS')}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.totalTVS}
            </div>
            <div
              className="text-xs mt-1 flex items-center gap-1"
              style={{ color: semanticColors.success.dark }}
              aria-label="增长 12.5%"
            >
              <TrendingUp className="w-3 h-3" aria-hidden="true" />
              +12.5%
            </div>
          </div>

          <div
            className="bg-white border p-3 sm:p-4 h-full flex flex-col justify-center transition-colors rounded-lg shadow-sm"
            style={{ borderColor: baseColors.gray[200] }}
            role="article"
            aria-label={`支持链数量: ${stats.totalChains}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded">
                <Globe
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  style={{ color: baseColors.gray[600] }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs sm:text-sm" style={{ color: baseColors.gray[500] }}>
                {t('totalChains')}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.totalChains}
            </div>
            <div className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {t('crossChain')}
            </div>
          </div>

          <div
            className="bg-white border p-3 sm:p-4 h-full flex flex-col justify-center transition-colors rounded-lg shadow-sm"
            style={{ borderColor: baseColors.gray[200] }}
            role="article"
            aria-label={`协议数量: ${stats.totalProtocols}+`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded">
                <Layers
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  style={{ color: baseColors.gray[600] }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs sm:text-sm" style={{ color: baseColors.gray[500] }}>
                {t('protocols')}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.totalProtocols}+
            </div>
            <div className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {t('integrations')}
            </div>
          </div>

          <div
            className="bg-white border p-3 sm:p-4 h-full flex flex-col justify-center transition-colors rounded-lg shadow-sm"
            style={{ borderColor: baseColors.gray[200] }}
            role="article"
            aria-label={`Chainlink 市场份额: ${stats.avgDominance}`}
          >
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded">
                <Activity
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                  style={{ color: baseColors.gray[600] }}
                  aria-hidden="true"
                />
              </div>
              <span className="text-xs sm:text-sm" style={{ color: baseColors.gray[500] }}>
                {t('dominance')}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold" style={{ color: baseColors.gray[900] }}>
              {stats.avgDominance}
            </div>
            <div className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
              {t('chainlinkShare')}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div
            className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto"
            role="tablist"
            aria-label="图表类型选择"
          >
            {(['pie', 'trend', 'bar'] as const).map((chartType) => {
              const isSelected = activeChart === chartType;
              const Icon =
                chartType === 'pie' ? PieChartIcon : chartType === 'trend' ? TrendingUp : BarChart3;
              const label =
                chartType === 'pie'
                  ? t('marketShare')
                  : chartType === 'trend'
                    ? t('tvsTrend')
                    : t('chainSupport');
              const shortcutKey = chartType === 'pie' ? '1' : chartType === 'trend' ? '2' : '3';

              return (
                <button
                  key={chartType}
                  ref={(el) => {
                    if (el) chartTypeButtonRefs.current[chartType] = el;
                  }}
                  onClick={() => setActiveChart(chartType)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActiveChart(chartType);
                    }
                  }}
                  role="tab"
                  tabIndex={isSelected ? 0 : -1}
                  aria-selected={isSelected}
                  aria-controls="chart-panel"
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-sm transition-colors border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white hover:border-gray-400'
                  }`}
                  style={{
                    color: isSelected ? baseColors.gray[50] : baseColors.gray[600],
                    borderColor: isSelected ? baseColors.gray[900] : baseColors.gray[200],
                  }}
                  aria-label={`${label} (快捷键: ${shortcutKey})`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                  <span className="text-xs sm:text-sm">{label}</span>
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-1 p-1"
            style={{ backgroundColor: baseColors.gray[100] }}
            role="group"
            aria-label="视图切换"
          >
            {(['chart', 'table'] as const).map((view) => {
              const isSelected = viewType === view;
              const Icon = view === 'chart' ? PieChartIcon : TableIcon;
              const label = view === 'chart' ? t('chart') : t('table');

              return (
                <button
                  key={view}
                  ref={(el) => {
                    if (el) viewTypeButtonRefs.current[view] = el;
                  }}
                  onClick={() => setViewType(view)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setViewType(view);
                    }
                  }}
                  aria-pressed={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                    isSelected ? 'bg-white border' : ''
                  }`}
                  style={{
                    color: isSelected ? baseColors.gray[900] : baseColors.gray[600],
                    borderColor: isSelected ? baseColors.gray[200] : 'transparent',
                  }}
                  aria-label={`${label} (快捷键: T)`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div
            className="lg:col-span-2 bg-white p-4 sm:p-6 shadow-sm rounded-lg border"
            style={{ borderColor: baseColors.gray[100] }}
            role="tabpanel"
            id="chart-panel"
            aria-label={getChartTitle()}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3
                className="text-base sm:text-lg font-semibold"
                style={{ color: baseColors.gray[900] }}
              >
                {getChartTitle()}
              </h3>
              <div className="flex items-center gap-2 sm:gap-3">
                {selectedItem && !isLoading && (
                  <button
                    onClick={() => setSelectedItem(null)}
                    aria-label="清除选择"
                    className="text-xs sm:text-sm flex items-center gap-1 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    style={{ color: baseColors.gray[600] }}
                  >
                    {t('clearSelection')}
                    <ChevronRight
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-90"
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
            </div>
            <div
              className={`${viewType === 'table' ? 'h-[300px] sm:h-[360px]' : 'h-[320px] sm:h-[400px]'}`}
              role="img"
              aria-label={generateChartAriaLabel()}
            >
              {isLoading || isRangeChanging ? (
                <ChartSkeleton
                  height={
                    viewType === 'table'
                      ? responsive.isMobile
                        ? 300
                        : 360
                      : responsive.isMobile
                        ? 320
                        : 400
                  }
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
                className="mt-3 sm:mt-4 flex items-center gap-1.5 sm:gap-2 text-xs"
                style={{ color: baseColors.gray[500] }}
                aria-hidden="true"
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {t('hoverForDetails')}
              </div>
            )}
            <div
              className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t"
              style={{ borderColor: baseColors.gray[100] }}
            >
              <div
                className="flex items-start gap-1.5 sm:gap-2 text-xs mb-1.5 sm:mb-2"
                style={{ color: semanticColors.warning.dark }}
                role="alert"
              >
                <AlertTriangle
                  className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5"
                  aria-hidden="true"
                />
                <span>{t('disclaimer')}</span>
              </div>
              <div
                className="flex items-center gap-1.5 sm:gap-2 text-xs"
                style={{ color: baseColors.gray[500] }}
              >
                <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                <span>{t('dataSource')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div
              className="p-3 sm:p-4 rounded-lg"
              style={{ backgroundColor: baseColors.gray[900], color: baseColors.gray[50] }}
              role="status"
              aria-label={`当前时间范围: ${selectedRange}`}
            >
              <div className="text-xs sm:text-sm mb-1" style={{ color: baseColors.gray[300] }}>
                {t('selectedTimeRange')}
              </div>
              <div className="text-xl sm:text-2xl font-bold" aria-live="polite">
                {selectedRange}
              </div>
              <div className="text-xs mt-1" style={{ color: baseColors.gray[400] }}>
                {t('dataUpdated')}
              </div>
            </div>

            <div
              className="bg-white border rounded-lg"
              style={{ borderColor: baseColors.gray[200] }}
              role="region"
              aria-label="预言机排名列表"
            >
              <div
                className="px-3 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between"
                style={{ borderColor: baseColors.gray[200], backgroundColor: baseColors.gray[50] }}
              >
                <span
                  className="text-xs sm:text-sm font-medium"
                  style={{ color: baseColors.gray[700] }}
                >
                  {t('oracleRankings')}
                </span>
                <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('tvsShare')}
                </span>
              </div>
              <div
                className="max-h-[280px] sm:max-h-[320px] overflow-y-auto divide-y divide-gray-100"
                role="list"
                aria-label="预言机列表"
              >
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
                    {t('totalMarketShare')}
                  </div>
                  <div
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: baseColors.gray[900] }}
                  >
                    100%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs mb-0.5" style={{ color: baseColors.gray[500] }}>
                    {t('oraclesCovered')}
                  </div>
                  <div
                    className="text-lg sm:text-xl font-bold"
                    style={{ color: baseColors.gray[900] }}
                  >
                    {stats.oracleCount}
                  </div>
                </div>
              </div>
            </div>

            <KeyboardShortcuts compact className="mt-3" />
          </div>
        </div>
      </div>
    </section>
  );
}

const OracleMarketOverview = memo(OracleMarketOverviewBase);

export default OracleMarketOverview;
