'use client';

import { useState, useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Server,
  Clock,
  Shield,
  Scale,
  BarChart3,
  Brain,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
} from 'lucide-react';

import { PriceChart } from '@/components/oracle';
import { useTranslations } from '@/i18n';
import { SeededRandom } from '@/lib/oracles/uma/mockDataConfig';
import { cn } from '@/lib/utils';

import { type UmaMarketViewProps } from '../types';

import { OptimisticOracleFlow } from './OptimisticOracleFlow';

interface OrderBookEntry {
  price: number;
  amount: number;
  total: number;
}

interface LargeTransaction {
  id: string;
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  value: number;
  time: string;
}

function OrderBookVisualization({ currentPrice }: { currentPrice: number }) {
  const t = useTranslations();
  const [viewMode, setViewMode] = useState<'both' | 'bids' | 'asks'>('both');

  const generateOrderBook = (
    basePrice: number
  ): { bids: OrderBookEntry[]; asks: OrderBookEntry[] } => {
    const rng = new SeededRandom(Math.floor(basePrice * 1000));
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    let bidTotal = 0;
    let askTotal = 0;

    for (let i = 0; i < 8; i++) {
      const bidPrice = basePrice * (1 - (i + 1) * 0.002);
      const bidAmount = rng.range(1000, 6000);
      bidTotal += bidAmount;
      bids.push({ price: bidPrice, amount: bidAmount, total: bidTotal });

      const askPrice = basePrice * (1 + (i + 1) * 0.002);
      const askAmount = rng.range(1000, 6000);
      askTotal += askAmount;
      asks.push({ price: askPrice, amount: askAmount, total: askTotal });
    }

    return { bids, asks };
  };

  const { bids, asks } = useMemo(() => generateOrderBook(currentPrice), [currentPrice]);
  const maxTotal = Math.max(bids[bids.length - 1]?.total || 0, asks[asks.length - 1]?.total || 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900">{t('uma.market.orderBook')}</h4>
        <div className="flex gap-1">
          {(['both', 'bids', 'asks'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors',
                viewMode === mode
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {mode === 'both' ? t('uma.market.all') : mode === 'bids' ? t('uma.market.bids') : t('uma.market.asks')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        {(viewMode === 'both' || viewMode === 'asks') && (
          <div className="space-y-0.5">
            <div className="grid grid-cols-3 text-xs text-gray-500 mb-1">
              <span>{t('uma.market.price')}</span>
              <span className="text-center">{t('uma.market.amount')}</span>
              <span className="text-right">{t('uma.market.total')}</span>
            </div>
            {asks
              .slice()
              .reverse()
              .map((ask, i) => (
                <div key={i} className="relative">
                  <div
                    className="absolute inset-0 bg-red-100"
                    style={{ width: `${(ask.total / maxTotal) * 100}%`, right: 0, left: 'auto' }}
                  />
                  <div className="relative grid grid-cols-3 text-xs py-1 px-1">
                    <span className="text-red-600 font-mono">{ask.price.toFixed(2)}</span>
                    <span className="text-center text-gray-700 font-mono">
                      {ask.amount.toFixed(0)}
                    </span>
                    <span className="text-right text-gray-500 font-mono">
                      {ask.total.toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}

        <div className="py-2 text-center border-y border-gray-100 my-2">
          <span className="text-lg font-bold text-gray-900">${currentPrice.toFixed(2)}</span>
        </div>

        {(viewMode === 'both' || viewMode === 'bids') && (
          <div className="space-y-0.5">
            {bids.map((bid, i) => (
              <div key={i} className="relative">
                <div
                  className="absolute inset-0 bg-emerald-100"
                  style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                />
                <div className="relative grid grid-cols-3 text-xs py-1 px-1">
                  <span className="text-emerald-600 font-mono">{bid.price.toFixed(2)}</span>
                  <span className="text-center text-gray-700 font-mono">
                    {bid.amount.toFixed(0)}
                  </span>
                  <span className="text-right text-gray-500 font-mono">{bid.total.toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiquidityDistribution({ currentPrice }: { currentPrice: number }) {
  const t = useTranslations();
  const liquidityData = useMemo(() => {
    const rng = new SeededRandom(Math.floor(currentPrice * 1000) + 500);
    return Array.from({ length: 20 }, (_, i) => {
      const priceOffset = (i - 10) * 0.5;
      const price = currentPrice + priceOffset;
      const liquidity = rng.range(100000, 1100000);
      return { price, liquidity };
    });
  }, [currentPrice]);

  const maxLiquidity = Math.max(...liquidityData.map((d) => d.liquidity));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-gray-600" />
        <h4 className="text-sm font-medium text-gray-900">{t('uma.market.liquidityDistribution')}</h4>
      </div>

      <div className="space-y-1">
        {liquidityData.map((data, i) => {
          const isCurrentPrice = Math.abs(data.price - currentPrice) < 0.5;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16 font-mono">${data.price.toFixed(1)}</span>
              <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded transition-all',
                    isCurrentPrice
                      ? 'bg-blue-500'
                      : data.price > currentPrice
                        ? 'bg-red-400'
                        : 'bg-emerald-400'
                  )}
                  style={{ width: `${(data.liquidity / maxLiquidity) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-20 text-right font-mono">
                ${(data.liquidity / 1000).toFixed(0)}K
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-gray-500">{t('uma.market.buySideLiquidity')}</p>
          <p className="text-sm font-semibold text-emerald-600">$2.8M</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('uma.market.sellSideLiquidity')}</p>
          <p className="text-sm font-semibold text-red-600">$3.1M</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">{t('uma.market.buySellRatio')}</p>
          <p className="text-sm font-semibold text-gray-900">0.90</p>
        </div>
      </div>
    </div>
  );
}

function LargeTransactionMonitor() {
  const t = useTranslations();
  const transactions: LargeTransaction[] = useMemo(
    () => [
      {
        id: '1',
        type: 'buy',
        price: 3.45,
        amount: 25000,
        value: 86250,
        time: `2${t('uma.market.minutesAgo')}`,
      },
      {
        id: '2',
        type: 'sell',
        price: 3.44,
        amount: 18000,
        value: 61920,
        time: `5${t('uma.market.minutesAgo')}`,
      },
      {
        id: '3',
        type: 'buy',
        price: 3.46,
        amount: 32000,
        value: 110720,
        time: `8${t('uma.market.minutesAgo')}`,
      },
      {
        id: '4',
        type: 'buy',
        price: 3.43,
        amount: 15000,
        value: 51450,
        time: `12${t('uma.market.minutesAgo')}`,
      },
      {
        id: '5',
        type: 'sell',
        price: 3.45,
        amount: 28000,
        value: 96600,
        time: `15${t('uma.market.minutesAgo')}`,
      },
    ],
    [t]
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">{t('uma.market.largeTransactionMonitor')}</h4>
        </div>
        <span className="text-xs text-gray-500">{'>'}$50K</span>
      </div>

      <div className="space-y-2">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center',
                  tx.type === 'buy' ? 'bg-emerald-100' : 'bg-red-100'
                )}
              >
                {tx.type === 'buy' ? (
                  <ChevronUp className="w-3 h-3 text-emerald-600" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {tx.type === 'buy' ? t('uma.market.buy') : t('uma.market.sell')} {tx.amount.toLocaleString()} UMA
                </p>
                <p className="text-xs text-gray-500">
                  ${tx.price.toFixed(2)} · {tx.time}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">${tx.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TechnicalIndicators({ currentPrice }: { currentPrice: number }) {
  const t = useTranslations();

  const rsiValue = 58;
  const macdValue = { macd: 0.045, signal: 0.032, histogram: 0.013 };
  const bollingerBands = {
    upper: currentPrice * 1.05,
    middle: currentPrice,
    lower: currentPrice * 0.95,
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">{t('uma.market.rsiIndicator')}</h4>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              rsiValue > 70
                ? 'bg-red-100 text-red-700'
                : rsiValue < 30
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-700'
            )}
          >
            {rsiValue > 70 ? t('uma.market.overbought') : rsiValue < 30 ? t('uma.market.oversold') : t('uma.market.neutral')}
          </span>
        </div>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute h-full rounded-full transition-all',
              rsiValue > 70 ? 'bg-red-500' : rsiValue < 30 ? 'bg-emerald-500' : 'bg-blue-500'
            )}
            style={{ width: `${rsiValue}%` }}
          />
          <div className="absolute top-0 h-full w-px bg-red-400" style={{ left: '70%' }} />
          <div className="absolute top-0 h-full w-px bg-emerald-400" style={{ left: '30%' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{t('uma.market.oversold')}</span>
          <span className="font-semibold text-gray-900">{rsiValue}</span>
          <span>{t('uma.market.overbought')}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">{t('uma.market.macdIndicator')}</h4>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded',
              macdValue.histogram > 0
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
            )}
          >
            {macdValue.histogram > 0 ? t('uma.market.bullish') : t('uma.market.bearish')}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">MACD</span>
            <span className="font-mono text-gray-900">{macdValue.macd.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.signalLine')}</span>
            <span className="font-mono text-gray-900">{macdValue.signal.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.histogram')}</span>
            <span
              className={cn(
                'font-mono',
                macdValue.histogram > 0 ? 'text-emerald-600' : 'text-red-600'
              )}
            >
              {macdValue.histogram.toFixed(3)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">{t('uma.market.bollingerBands')}</h4>
          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">{t('uma.market.normal')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.upperBand')}</span>
            <span className="font-mono text-red-600">${bollingerBands.upper.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.middleBand')}</span>
            <span className="font-mono text-gray-900">${bollingerBands.middle.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.lowerBand')}</span>
            <span className="font-mono text-emerald-600">${bollingerBands.lower.toFixed(2)}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.bandwidth')}</span>
            <span className="text-gray-900">10.0%</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">{t('uma.market.volume')}</h4>
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">{t('uma.market.active')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.volume24hLabel')}</span>
            <span className="font-mono text-gray-900">$8.2M</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.avgVolume')}</span>
            <span className="font-mono text-gray-900">$6.5M</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.volumeRatio')}</span>
            <span className="font-mono text-emerald-600">1.26x</span>
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">{t('uma.market.status')}</span>
            <span className="text-emerald-600">{t('uma.market.aboveAverage')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketSentimentAnalysis() {
  const [activeTab, setActiveTab] = useState<'sentiment' | 'social'>('sentiment');

  const longShortRatio = { long: 62, short: 38 };
  const fearGreedIndex = 45;
  const socialSentiment = {
    twitter: { positive: 68, neutral: 22, negative: 10, mentions: 1250 },
    reddit: { positive: 55, neutral: 30, negative: 15, mentions: 320 },
    telegram: { positive: 72, neutral: 18, negative: 10, mentions: 890 },
  };

  const getSentimentLabel = (index: number) => {
    const t = useTranslations();
    if (index <= 25) return { label: t('uma.market.extremeFear'), color: 'text-red-600', bg: 'bg-red-100' };
    if (index <= 45) return { label: t('uma.market.fear'), color: 'text-orange-600', bg: 'bg-orange-100' };
    if (index <= 55) return { label: t('uma.market.neutral'), color: 'text-gray-600', bg: 'bg-gray-100' };
    if (index <= 75) return { label: t('uma.market.greed'), color: 'text-emerald-600', bg: 'bg-emerald-100' };
    return { label: t('uma.market.extremeGreed'), color: 'text-green-600', bg: 'bg-green-100' };
  };

  const t = useTranslations();
  const sentimentInfo = getSentimentLabel(fearGreedIndex);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-gray-600" />
          <h4 className="text-sm font-medium text-gray-900">{t('uma.market.marketSentimentAnalysis')}</h4>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('sentiment')}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              activeTab === 'sentiment'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {t('uma.market.marketSentiment')}
          </button>
          <button
            onClick={() => setActiveTab('social')}
            className={cn(
              'px-3 py-1 text-xs rounded transition-colors',
              activeTab === 'social'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {t('uma.market.socialMedia')}
          </button>
        </div>
      </div>

      {activeTab === 'sentiment' ? (
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('uma.market.longShortRatio')}</span>
              <span className="text-xs text-gray-500">24h</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-8 bg-red-100 rounded-l-lg overflow-hidden flex items-center justify-end pr-2">
                <span className="text-xs font-semibold text-red-700">{longShortRatio.short}%</span>
              </div>
              <div className="flex-1 h-8 bg-emerald-100 rounded-r-lg overflow-hidden flex items-center pl-2">
                <span className="text-xs font-semibold text-emerald-700">
                  {longShortRatio.long}%
                </span>
              </div>
            </div>
            <div className="flex justify-between mt-1 text-xs text-gray-500">
              <span>{t('uma.market.short')} {longShortRatio.short}%</span>
              <span>{t('uma.market.long')} {longShortRatio.long}%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">{t('uma.market.fearGreedIndex')}</span>
              <span
                className={cn('text-xs px-2 py-0.5 rounded', sentimentInfo.bg, sentimentInfo.color)}
              >
                {sentimentInfo.label}
              </span>
            </div>
            <div className="relative h-3 bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full overflow-hidden">
              <div
                className="absolute top-0 w-1 h-full bg-gray-900"
                style={{ left: `${fearGreedIndex}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-2xl font-bold text-gray-900">{fearGreedIndex}</span>
              <div className="text-right">
                <p className="text-xs text-gray-500">{t('uma.market.yesterday')}</p>
                <p className="text-sm font-semibold text-gray-700">52</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('uma.market.liquidationHeat')}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '35%' }} />
                </div>
                <span className="text-xs font-semibold text-gray-900">35%</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('uma.market.fundingRate')}</p>
              <p className="text-sm font-semibold text-emerald-600">+0.0125%</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(socialSentiment).map(([platform, data]) => (
            <div key={platform} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 capitalize">{platform}</span>
                </div>
                <span className="text-xs text-gray-500">{data.mentions} {t('uma.market.discussions')}</span>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-400" style={{ width: `${data.positive}%` }} />
                <div className="bg-gray-300" style={{ width: `${data.neutral}%` }} />
                <div className="bg-red-400" style={{ width: `${data.negative}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span className="text-emerald-600">{t('uma.market.positive')} {data.positive}%</span>
                <span className="text-gray-500">{t('uma.market.neutral')} {data.neutral}%</span>
                <span className="text-red-600">{t('uma.market.negative')} {data.negative}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketDepthChart({ currentPrice }: { currentPrice: number }) {
  const depthData = useMemo(() => {
    const rng = new SeededRandom(Math.floor(currentPrice * 1000) + 600);
    const bids: { price: number; depth: number }[] = [];
    const asks: { price: number; depth: number }[] = [];

    for (let i = 0; i < 15; i++) {
      const bidPrice = currentPrice * (1 - i * 0.01);
      const askPrice = currentPrice * (1 + i * 0.01);
      const bidDepth = rng.range(100000, 600000);
      const askDepth = rng.range(100000, 600000);

      bids.push({ price: bidPrice, depth: bidDepth });
      asks.push({ price: askPrice, depth: askDepth });
    }

    return { bids, asks };
  }, [currentPrice]);

  const maxDepth = Math.max(
    ...depthData.bids.map((d) => d.depth),
    ...depthData.asks.map((d) => d.depth)
  );

  const t = useTranslations();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-gray-600" />
        <h4 className="text-sm font-medium text-gray-900">{t('uma.market.orderBookDepth')}</h4>
      </div>

      <div className="relative h-40">
        <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="bidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="askGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          <path
            d={depthData.bids
              .map((d, i) => {
                const x = 200 - (i / 15) * 180;
                const y = 160 - (d.depth / maxDepth) * 140;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
          />
          <path
            d={depthData.bids
              .map((d, i) => {
                const x = 200 - (i / 15) * 180;
                const y = 160 - (d.depth / maxDepth) * 140;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="url(#bidGradient)"
          />

          <path
            d={depthData.asks
              .map((d, i) => {
                const x = 200 + (i / 15) * 180;
                const y = 160 - (d.depth / maxDepth) * 140;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
          />
          <path
            d={depthData.asks
              .map((d, i) => {
                const x = 200 + (i / 15) * 180;
                const y = 160 - (d.depth / maxDepth) * 140;
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
              })
              .join(' ')}
            fill="url(#askGradient)"
          />

          <line
            x1="200"
            y1="0"
            x2="200"
            y2="160"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4"
          />
        </svg>

        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
          ${currentPrice.toFixed(2)}
        </div>
      </div>

      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{t('uma.market.bidDepth')}</span>
        <span>{t('uma.market.currentPrice')}</span>
        <span>{t('uma.market.askDepth')}</span>
      </div>
    </div>
  );
}

export function UmaMarketView({ config, price, networkStats }: UmaMarketViewProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;

  const stats = [
    {
      label: t('uma.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(2)}B`,
      change: '+5%',
    },
    {
      label: t('uma.stats.volume24h'),
      value: `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`,
      change: '+8%',
    },
    {
      label: t('uma.stats.circulatingSupply'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M UMA`,
      change: null,
    },
    {
      label: t('uma.stats.stakingApr'),
      value: `${config.marketData.stakingApr ?? '8.5'}%`,
      change: null,
      highlight: true,
    },
  ];

  const networkStatus = [
    {
      label: t('uma.stats.activeValidators'),
      value: `${networkStats?.activeValidators ?? 850}+`,
      status: 'healthy' as const,
      icon: Server,
    },
    {
      label: t('uma.stats.totalDisputes'),
      value: `${networkStats?.totalDisputes ?? 1250}+`,
      status: 'healthy' as const,
      icon: Scale,
    },
    {
      label: t('uma.stats.disputeSuccessRate'),
      value: `${networkStats?.disputeSuccessRate ?? 78}%`,
      status: 'healthy' as const,
      icon: Shield,
    },
    {
      label: t('uma.stats.avgResolutionTime'),
      value: `${networkStats?.avgResolutionTime ?? 4.2}h`,
      status: 'healthy' as const,
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8">
      <OptimisticOracleFlow />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-medium text-gray-900">{t('uma.priceTrend')}</h3>
          </div>
          <div className="flex-1">
            <PriceChart
              client={config.client}
              symbol={config.symbol}
              chain={config.defaultChain}
              height={300}
              showToolbar={true}
              defaultPrice={config.marketData.change24hValue}
            />
          </div>
        </div>

        <div className="flex flex-col gap-8">
          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.quickStats')}</h3>
            <div className="flex-1 flex flex-col">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-500">{stat.label}</span>
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium ${
                        stat.highlight ? 'text-emerald-600' : 'text-gray-900'
                      }`}
                    >
                      {stat.value}
                    </span>
                    {stat.change && (
                      <span
                        className={`text-xs ml-2 ${
                          stat.change.startsWith('+') ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {stat.change}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.networkStatus')}</h3>
            <div className="flex-1 flex flex-col gap-3">
              {networkStatus.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-500">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{item.value}</span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <h3 className="text-base font-medium text-gray-900 mb-4">{t('uma.dataSource')}</h3>
            <div className="flex-1 flex flex-col">
              {[
                { name: 'UMA Market', status: 'active', latency: '150ms' },
                { name: 'Ethereum Mainnet', status: 'active', latency: '300ms' },
                { name: 'Secondary Feed', status: 'active', latency: '180ms' },
                { name: 'Backup Node', status: 'syncing', latency: '450ms' },
              ].map((source, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        source.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{source.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{source.latency}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('uma.market.tradingPair')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">UMA/USDC</p>
            <p className="text-2xl font-semibold text-gray-900">${currentPrice.toFixed(2)}</p>
            <div className="flex items-center gap-1 mt-1">
              {priceChange24h >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span
                className={`text-sm ${priceChange24h >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {priceChange24h >= 0 ? '+' : ''}
                {priceChange24h.toFixed(2)}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.volume24h')}</p>
            <p className="text-2xl font-semibold text-gray-900">
              ${(config.marketData.volume24h / 1e6).toFixed(1)}M
            </p>
            <p className="text-sm text-emerald-600 mt-1">+8.2%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.liquidity')}</p>
            <p className="text-2xl font-semibold text-gray-900">$28.5M</p>
            <p className="text-sm text-emerald-600 mt-1">+3.5%</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">{t('uma.marketDepth')}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-semibold text-gray-900">7.8</span>
              <span className="text-sm text-gray-400">/10</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('uma.depthScore')}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">{t('uma.market.technicalIndicators')}</h3>
        </div>
        <TechnicalIndicators currentPrice={currentPrice} />
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-gray-600" />
          <h3 className="text-base font-medium text-gray-900">{t('uma.market.marketDepthData')}</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MarketDepthChart currentPrice={currentPrice} />
          <OrderBookVisualization currentPrice={currentPrice} />
          <div className="space-y-6">
            <LiquidityDistribution currentPrice={currentPrice} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LargeTransactionMonitor />
        <MarketSentimentAnalysis />
      </div>
    </div>
  );
}
