'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n/context';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/Card';
import { OracleProvider, PriceData } from '@/lib/types/oracle';
import {
  ChainlinkClient,
  BandProtocolClient,
  UMAClient,
  PythNetworkClient,
  API3Client,
} from '@/lib/oracles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const oracleClients = {
  [OracleProvider.CHAINLINK]: new ChainlinkClient(),
  [OracleProvider.BAND_PROTOCOL]: new BandProtocolClient(),
  [OracleProvider.UMA]: new UMAClient(),
  [OracleProvider.PYTH_NETWORK]: new PythNetworkClient(),
  [OracleProvider.API3]: new API3Client(),
};

const oracleNames = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH_NETWORK]: 'Pyth Network',
  [OracleProvider.API3]: 'API3',
};

const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD'];

type SortColumn = 'price' | 'timestamp' | null;
type SortDirection = 'asc' | 'desc';

export default function CrossOraclePage() {
  const { t } = useI18n();
  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>([
    OracleProvider.CHAINLINK,
    OracleProvider.BAND_PROTOCOL,
  ]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC/USD');
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [historicalData, setHistoricalData] = useState<
    Partial<Record<OracleProvider, PriceData[]>>
  >({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const validPrices = priceData.map((d) => d.price).filter((p) => p > 0);
  const avgPrice =
    validPrices.length > 0 ? validPrices.reduce((a, b) => a + b, 0) / validPrices.length : 0;
  const maxPrice = validPrices.length > 0 ? Math.max(...validPrices) : 0;
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;
  const priceRange = maxPrice - minPrice;

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPriceData = [...priceData].sort((a, b) => {
    if (!sortColumn) return 0;

    if (sortColumn === 'price') {
      return sortDirection === 'asc' ? a.price - b.price : b.price - a.price;
    }

    if (sortColumn === 'timestamp') {
      return sortDirection === 'asc' ? a.timestamp - b.timestamp : b.timestamp - a.timestamp;
    }

    return 0;
  });

  const fetchPriceData = useCallback(async () => {
    setIsLoading(true);
    const prices: PriceData[] = [];
    const histories: Partial<Record<OracleProvider, PriceData[]>> = {};

    for (const oracle of selectedOracles) {
      try {
        const client = oracleClients[oracle];
        const price = await client.getPrice(selectedSymbol.split('/')[0]);
        const history = await client.getHistoricalPrices(
          selectedSymbol.split('/')[0],
          undefined,
          24
        );
        prices.push(price);
        histories[oracle] = history;
      } catch (error) {
        console.error(`Error fetching data from ${oracle}:`, error);
      }
    }

    setPriceData(prices);
    setHistoricalData(histories);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [selectedOracles, selectedSymbol]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPriceData();
  }, [fetchPriceData]);

  const toggleOracle = (oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  };

  const chartColors = {
    [OracleProvider.CHAINLINK]: '#375BD2',
    [OracleProvider.BAND_PROTOCOL]: '#4F46E5',
    [OracleProvider.UMA]: '#EC4899',
    [OracleProvider.PYTH_NETWORK]: '#8B5CF6',
    [OracleProvider.API3]: '#10B981',
  };

  const getChartData = () => {
    if (Object.keys(historicalData).length === 0) return [];

    const timestamps = new Set<number>();
    Object.values(historicalData).forEach((history) => {
      history.forEach((data) => timestamps.add(data.timestamp));
    });

    const sortedTimestamps = Array.from(timestamps).sort((a, b) => a - b);

    return sortedTimestamps.map((timestamp) => {
      const point: Record<string, string | number | undefined> = {
        timestamp: new Date(timestamp).toLocaleTimeString(),
      };

      selectedOracles.forEach((oracle) => {
        const dataPoint = historicalData[oracle]?.find((d) => d.timestamp === timestamp);
        if (dataPoint) {
          point[oracleNames[oracle]] = dataPoint.price;
        }
      });

      return point;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">{t('title')}</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('refresh')}
          </button>
          {lastUpdated && (
            <span className="text-sm text-gray-500">
              {t('lastUpdated', { time: lastUpdated.toLocaleTimeString() })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('averagePrice')}</p>
            <p className="text-3xl font-bold text-gray-900">
              {avgPrice > 0
                ? `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">
              {t('highestPrice')} / {t('lowestPrice')}
            </p>
            <p className="text-3xl font-bold text-gray-900">
              {maxPrice > 0
                ? `$${maxPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
            {minPrice > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {t('lowestPrice')}: $
                {minPrice.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm font-medium text-gray-600 mb-1">{t('priceRange')}</p>
            <p className="text-3xl font-bold text-gray-900">
              {priceRange > 0
                ? `$${priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {t('selectSymbol')} & {t('selectOracles')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {symbols.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => setSelectedSymbol(symbol)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedSymbol === symbol
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap gap-2">
                {Object.values(OracleProvider).map((oracle) => (
                  <label
                    key={oracle}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedOracles.includes(oracle)}
                      onChange={() => toggleOracle(oracle)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{oracleNames[oracle]}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('currentPriceComparison')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      {t('oracle')}
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('price')}
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            sortColumn === 'price'
                              ? sortDirection === 'asc'
                                ? 'rotate-180'
                                : ''
                              : 'opacity-30'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </th>
                    {validPrices.length > 1 && avgPrice > 0 && (
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                        {t('deviation')}
                      </th>
                    )}
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">
                      {t('confidence')}
                    </th>
                    <th
                      className="text-right py-3 px-4 text-sm font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none"
                      onClick={() => handleSort('timestamp')}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {t('timestamp')}
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            sortColumn === 'timestamp'
                              ? sortDirection === 'asc'
                                ? 'rotate-180'
                                : ''
                              : 'opacity-30'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPriceData.map((data, index) => {
                    let deviationPercent: number | null = null;
                    if (validPrices.length > 1 && avgPrice > 0 && data.price > 0) {
                      deviationPercent = ((data.price - avgPrice) / avgPrice) * 100;
                    }
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chartColors[data.provider] }}
                            />
                            <span className="font-medium text-gray-900">
                              {oracleNames[data.provider]}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold text-gray-900">
                          $
                          {data.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        {validPrices.length > 1 && avgPrice > 0 && (
                          <td className="py-4 px-4 text-right font-semibold">
                            {deviationPercent !== null ? (
                              <span
                                className={
                                  deviationPercent >= 0 ? 'text-green-600' : 'text-red-600'
                                }
                              >
                                {deviationPercent >= 0 ? '+' : ''}
                                {deviationPercent.toFixed(2)}%
                              </span>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        <td className="py-4 px-4 text-right text-gray-700">
                          {data.confidence ? `${(data.confidence * 100).toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-4 px-4 text-right text-gray-500 text-sm">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('priceTrend')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <svg
                className="w-8 h-8 text-blue-600 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
          ) : (
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="timestamp"
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#6b7280"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {selectedOracles.map((oracle) => (
                    <Line
                      key={oracle}
                      type="monotone"
                      dataKey={oracleNames[oracle]}
                      stroke={chartColors[oracle]}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
