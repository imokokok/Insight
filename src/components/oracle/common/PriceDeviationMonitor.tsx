'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythClient,
  API3Client,
  PriceData,
  OracleProvider,
  Blockchain,
} from '@/lib/oracles';
import { useI18n } from '@/lib/i18n/provider';
import { createLogger } from '@/lib/utils/logger';
import { chartColors } from '@/lib/config/colors';
const logger = createLogger('PriceDeviationMonitor');

interface DeviationData {
  timestamp: number;
  time: string;
  chainlink: number;
  pyth: number;
  band: number;
  uma: number;
  api3: number;
  deviationPercent: number;
}

interface CurrentPriceData {
  provider: OracleProvider;
  price: number;
  timestamp: number;
  deviation: number;
  deviationPercent: number;
  status: 'normal' | 'warning' | 'critical';
}

const DEVIATION_THRESHOLDS = {
  warning: 0.5,
  critical: 1.0,
};

const REFRESH_INTERVAL = 10000;

const PROVIDER_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.BAND_PROTOCOL]: 'Band',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLAR]: 'Tellar',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

const PROVIDER_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.PYTH]: chartColors.oracle.pyth,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: '#6366F1',
  [OracleProvider.TELLAR]: '#06B6D4',
  [OracleProvider.CHRONICLE]: '#E11D48',
  [OracleProvider.WINKLINK]: '#FF4D4D',
};

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

export function PriceDeviationMonitor() {
  const { t } = useI18n();
  const [symbol, setSymbol] = useState<string>('LINK');
  const [chain, setChain] = useState<Blockchain>(Blockchain.ETHEREUM);
  const [currentPrices, setCurrentPrices] = useState<CurrentPriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<DeviationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [deviationStartTime, setDeviationStartTime] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrices = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const chainlinkClient = new ChainlinkClient();
      const pythClient = new PythClient();
      const bandClient = new BandProtocolClient();
      const umaClient = new UMAClient();
      const api3Client = new API3Client();

      const results = await Promise.allSettled([
        chainlinkClient.getPrice(symbol, chain),
        pythClient.getPrice(symbol, chain),
        bandClient.getPrice(symbol, chain),
        umaClient.getPrice(symbol, chain),
        api3Client.getPrice(symbol, chain),
      ]);

      if (abortController.signal.aborted) return;

      const prices: PriceData[] = [];
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          prices.push(result.value);
        }
      });

      if (prices.length === 0) {
        setLoading(false);
        return;
      }

      const chainlinkPrice =
        prices.find((p) => p.provider === OracleProvider.CHAINLINK)?.price || prices[0].price;
      const priceDataList: CurrentPriceData[] = prices.map((p) => {
        const deviation = p.price - chainlinkPrice;
        const deviationPercent = chainlinkPrice > 0 ? (deviation / chainlinkPrice) * 100 : 0;
        let status: 'normal' | 'warning' | 'critical' = 'normal';
        if (Math.abs(deviationPercent) >= DEVIATION_THRESHOLDS.critical) {
          status = 'critical';
        } else if (Math.abs(deviationPercent) >= DEVIATION_THRESHOLDS.warning) {
          status = 'warning';
        }
        return {
          provider: p.provider,
          price: p.price,
          timestamp: p.timestamp,
          deviation,
          deviationPercent,
          status,
        };
      });

      setCurrentPrices(priceDataList);
      setLastUpdated(Date.now());

      const hasSignificantDeviation = priceDataList.some(
        (p) => Math.abs(p.deviationPercent) >= DEVIATION_THRESHOLDS.warning
      );

      if (hasSignificantDeviation && !deviationStartTime) {
        setDeviationStartTime(Date.now());
      } else if (!hasSignificantDeviation) {
        setDeviationStartTime(null);
      }

      setHistoricalData((prev) => {
        const newEntry: DeviationData = {
          timestamp: Date.now(),
          time: formatTime(Date.now()),
          chainlink: priceDataList.find((p) => p.provider === OracleProvider.CHAINLINK)?.price || 0,
          pyth: priceDataList.find((p) => p.provider === OracleProvider.PYTH)?.price || 0,
          band: priceDataList.find((p) => p.provider === OracleProvider.BAND_PROTOCOL)?.price || 0,
          uma: priceDataList.find((p) => p.provider === OracleProvider.UMA)?.price || 0,
          api3: priceDataList.find((p) => p.provider === OracleProvider.API3)?.price || 0,
          deviationPercent: Math.max(...priceDataList.map((p) => Math.abs(p.deviationPercent))),
        };

        const newData = [...prev, newEntry].slice(-60);
        return newData;
      });

      setLoading(false);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      logger.error(
        'Error fetching prices',
        error instanceof Error ? error : new Error(String(error))
      );
      setLoading(false);
    }
  }, [symbol, chain, deviationStartTime]);

  useEffect(() => {
    fetchPrices();

    if (autoRefresh) {
      intervalRef.current = setInterval(fetchPrices, REFRESH_INTERVAL);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices, autoRefresh]);

  const chainlinkPrice =
    currentPrices.find((p) => p.provider === OracleProvider.CHAINLINK)?.price || 0;
  const avgDeviation =
    currentPrices.length > 0
      ? currentPrices.reduce((sum, p) => sum + Math.abs(p.deviationPercent), 0) /
        currentPrices.length
      : 0;
  const maxDeviation =
    currentPrices.length > 0
      ? Math.max(...currentPrices.map((p) => Math.abs(p.deviationPercent)))
      : 0;

  const symbols = ['LINK', 'BTC', 'ETH', 'SOL', 'USDC'];
  const chains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('priceDeviation.selectSymbol')}
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {symbols.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('priceDeviation.selectChain')}
            </label>
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value as Blockchain)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              {chains.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('priceDeviation.autoRefresh')}</span>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <button
            onClick={fetchPrices}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {t('priceDeviation.refresh')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('priceDeviation.chainlinkPrice')}</div>
          <div className="text-2xl font-bold text-gray-900">${chainlinkPrice.toFixed(4)}</div>
          <div className="text-xs text-gray-500 mt-1">{t('priceDeviation.referencePrice')}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('priceDeviation.avgDeviation')}</div>
          <div
            className={`text-2xl font-bold ${avgDeviation >= DEVIATION_THRESHOLDS.warning ? 'text-orange-600' : 'text-gray-900'}`}
          >
            {avgDeviation.toFixed(3)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">{t('priceDeviation.avgDeviationDesc')}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('priceDeviation.maxDeviation')}</div>
          <div
            className={`text-2xl font-bold ${maxDeviation >= DEVIATION_THRESHOLDS.critical ? 'text-red-600' : maxDeviation >= DEVIATION_THRESHOLDS.warning ? 'text-orange-600' : 'text-gray-900'}`}
          >
            {maxDeviation.toFixed(3)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">{t('priceDeviation.maxDeviationDesc')}</div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">{t('priceDeviation.deviationDuration')}</div>
          <div className="text-2xl font-bold text-gray-900">
            {deviationStartTime ? formatDuration(Date.now() - deviationStartTime) : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {t('priceDeviation.deviationDurationDesc')}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('priceDeviation.currentComparison')}
        </h3>

        {loading && currentPrices.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3 text-gray-400">
              <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>{t('priceDeviation.loading')}</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                    {t('priceDeviation.provider')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    {t('priceDeviation.price')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    {t('priceDeviation.deviation')}
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-600">
                    {t('priceDeviation.deviationPercent')}
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600">
                    {t('priceDeviation.status')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {currentPrices.map((price) => (
                  <tr key={price.provider} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: PROVIDER_COLORS[price.provider] }}
                        />
                        <span className="font-medium text-gray-900">
                          {PROVIDER_NAMES[price.provider]}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-mono text-gray-900">
                      ${price.price.toFixed(4)}
                    </td>
                    <td
                      className={`text-right py-3 px-4 font-mono ${price.deviation >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {price.deviation >= 0 ? '+' : ''}${price.deviation.toFixed(4)}
                    </td>
                    <td
                      className={`text-right py-3 px-4 font-mono ${price.deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {price.deviationPercent >= 0 ? '+' : ''}
                      {price.deviationPercent.toFixed(3)}%
                    </td>
                    <td className="text-center py-3 px-4">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          price.status === 'normal'
                            ? 'bg-green-100 text-green-700'
                            : price.status === 'warning'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {t(`priceDeviation.status_${price.status}`)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-gray-500">
          {t('priceDeviation.lastUpdated')}: {formatTime(lastUpdated)}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('priceDeviation.deviationBarChart')}
        </h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentPrices} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="provider"
                tickFormatter={(value) => PROVIDER_NAMES[value as OracleProvider]}
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 12, fill: chartColors.recharts.tick }}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 12, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip
                formatter={(value) => {
                  const numValue = Number(value);
                  return [`${numValue.toFixed(4)}%`, t('priceDeviation.deviationPercent')];
                }}
                labelFormatter={(label) => PROVIDER_NAMES[label as OracleProvider]}
              />
              <ReferenceLine
                y={DEVIATION_THRESHOLDS.warning}
                stroke={chartColors.recharts.warning}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={-DEVIATION_THRESHOLDS.warning}
                stroke={chartColors.recharts.warning}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={DEVIATION_THRESHOLDS.critical}
                stroke={chartColors.recharts.danger}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={-DEVIATION_THRESHOLDS.critical}
                stroke={chartColors.recharts.danger}
                strokeDasharray="5 5"
              />
              <Bar dataKey="deviationPercent" radius={[4, 4, 0, 0]}>
                {currentPrices.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.status === 'critical'
                        ? chartColors.recharts.danger
                        : entry.status === 'warning'
                          ? chartColors.recharts.warning
                          : chartColors.recharts.success
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span className="text-xs text-gray-600">{t('priceDeviation.status_normal')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span className="text-xs text-gray-600">{t('priceDeviation.status_warning')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span className="text-xs text-gray-600">{t('priceDeviation.status_critical')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('priceDeviation.priceTrendChart')}
        </h3>
        <div style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="time"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={30}
              />
              <YAxis
                yAxisId="price"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                width={70}
              />
              <YAxis
                yAxisId="deviation"
                orientation="right"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                width={60}
              />
              <Tooltip
                formatter={(value, name) => {
                  const numValue = Number(value);
                  if (name === 'deviationPercent') {
                    return [`${numValue.toFixed(3)}%`, t('priceDeviation.maxDeviation')];
                  }
                  return [
                    `$${numValue.toFixed(4)}`,
                    PROVIDER_NAMES[name as OracleProvider] || String(name),
                  ];
                }}
              />
              <Legend
                formatter={(value) => {
                  if (value === 'deviationPercent') return t('priceDeviation.maxDeviation');
                  return PROVIDER_NAMES[value as OracleProvider] || value;
                }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="chainlink"
                stroke={PROVIDER_COLORS[OracleProvider.CHAINLINK]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="pyth"
                stroke={PROVIDER_COLORS[OracleProvider.PYTH]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="band"
                stroke={PROVIDER_COLORS[OracleProvider.BAND_PROTOCOL]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="uma"
                stroke={PROVIDER_COLORS[OracleProvider.UMA]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="api3"
                stroke={PROVIDER_COLORS[OracleProvider.API3]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                yAxisId="deviation"
                type="monotone"
                dataKey="deviationPercent"
                stroke={chartColors.recharts.tick}
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {t('priceDeviation.deviationTrendChart')}
        </h3>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="time"
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                minTickGap={30}
              />
              <YAxis
                stroke={chartColors.recharts.axis}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `${value.toFixed(2)}%`}
              />
              <Tooltip
                formatter={(value) => {
                  const numValue = Number(value);
                  return [`${numValue.toFixed(3)}%`, t('priceDeviation.maxDeviation')];
                }}
              />
              <ReferenceLine
                y={DEVIATION_THRESHOLDS.warning}
                stroke={chartColors.recharts.warning}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={-DEVIATION_THRESHOLDS.warning}
                stroke={chartColors.recharts.warning}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={DEVIATION_THRESHOLDS.critical}
                stroke={chartColors.recharts.danger}
                strokeDasharray="5 5"
              />
              <ReferenceLine
                y={-DEVIATION_THRESHOLDS.critical}
                stroke={chartColors.recharts.danger}
                strokeDasharray="5 5"
              />
              <Line
                type="monotone"
                dataKey="deviationPercent"
                stroke={chartColors.recharts.primaryLight}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-orange-500 border-dashed"
              style={{ borderTop: '2px dashed #f59e0b' }}
            />
            <span className="text-xs text-gray-600">
              {t('priceDeviation.warningThreshold')} (±0.5%)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-red-500 border-dashed"
              style={{ borderTop: '2px dashed #ef4444' }}
            />
            <span className="text-xs text-gray-600">
              {t('priceDeviation.criticalThreshold')} (±1.0%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
