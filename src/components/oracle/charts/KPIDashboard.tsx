'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';

interface KPIDashboardProps {
  price: number;
  priceChange24h: number;
  priceChangePercent: number;
  updateFrequency: number;
  networkHealth: 'healthy' | 'warning' | 'critical';
  dataQualityScore: number;
  className?: string;
}

function ScrollIndicator({
  totalItems,
  currentIndex,
  onIndicatorClick,
}: {
  totalItems: number;
  currentIndex: number;
  onIndicatorClick: (index: number) => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex justify-center gap-2 mt-4 md:hidden">
      {Array.from({ length: totalItems }).map((_, index) => (
        <button
          key={index}
          onClick={() => onIndicatorClick(index)}
          className={`p-2  transition-all duration-300 ${
            index === currentIndex ? 'w-8 bg-blue-600' : 'w-1.5 bg-gray-300 hover:bg-gray-400'
          }`}
          aria-label={t('kpiDashboard.goToPage', { page: index + 1 })}
        />
      ))}
    </div>
  );
}

interface UpdateInterval {
  timestamp: number;
  interval: number;
}

const getHealthConfig = (t: (key: string) => string) => ({
  healthy: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    label: t('kpiDashboard.health.healthy'),
    pulseColor: 'bg-green-400',
  },
  warning: {
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: t('kpiDashboard.health.warning'),
    pulseColor: 'bg-yellow-400',
  },
  critical: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    label: t('kpiDashboard.health.critical'),
    pulseColor: 'bg-red-400',
  },
});

function getQualityColor(score: number): string {
  if (score >= 90) return semanticColors.success.DEFAULT;
  if (score >= 70) return semanticColors.info.DEFAULT;
  if (score >= 50) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
}

function getQualityLevel(score: number, t: (key: string) => string): string {
  if (score >= 90) return t('kpiDashboard.quality.excellent');
  if (score >= 70) return t('kpiDashboard.quality.good');
  if (score >= 50) return t('kpiDashboard.quality.average');
  return t('kpiDashboard.quality.poor');
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (price >= 1) {
    return price.toFixed(4);
  }
  return price.toFixed(6);
}

function PriceCard({ price, previousPrice }: { price: number; previousPrice: number | null }) {
  const t = useTranslations();
  const [isFlashing, setIsFlashing] = useState(false);
  const [borderFlash, setBorderFlash] = useState(false);
  const prevPriceRef = useRef(previousPrice);

  useEffect(() => {
    if (prevPriceRef.current !== null && prevPriceRef.current !== price) {
      setIsFlashing(true);
      setBorderFlash(true);
      const timer = setTimeout(() => setIsFlashing(false), 300);
      const borderTimer = setTimeout(() => setBorderFlash(false), 600);
      return () => {
        clearTimeout(timer);
        clearTimeout(borderTimer);
      };
    }
    prevPriceRef.current = price;
  }, [price]);

  return (
    <div
      className={`bg-white border  p-4 hover:border-gray-300 transition-all duration-200 ${borderFlash ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('kpiDashboard.realtimePrice')}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-gray-400 text-lg">$</span>
            <span
              className={`text-xl md:text-2xl font-bold text-gray-900 transition-all duration-200 ${
                isFlashing ? 'text-blue-500 scale-105' : ''
              }`}
            >
              {formatPrice(price)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full  bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex  h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-xs text-gray-400">{t('kpiDashboard.updating')}</span>
          </div>
        </div>
        <div className="p-2.5 bg-blue-50  text-blue-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function PriceChangeCard({
  priceChange24h,
  priceChangePercent,
  colorBlindMode = false,
}: {
  priceChange24h: number;
  priceChangePercent: number;
  colorBlindMode?: boolean;
}) {
  const t = useTranslations();
  const [borderFlash, setBorderFlash] = useState(false);
  const prevPercentRef = useRef(priceChangePercent);

  useEffect(() => {
    if (prevPercentRef.current !== priceChangePercent) {
      setBorderFlash(true);
      const timer = setTimeout(() => setBorderFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevPercentRef.current = priceChangePercent;
  }, [priceChangePercent]);

  const isPositive = priceChangePercent >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  const bgClass = isPositive ? 'bg-green-50' : 'bg-red-50';
  const arrow = isPositive ? '↑' : '↓';

  return (
    <div
      className={`bg-white border  p-4 hover:border-gray-300 transition-all duration-200 ${borderFlash ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('kpiDashboard.priceChange24h')}
          </p>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl md:text-2xl font-bold ${colorClass}`}>
              <span className="font-bold">{arrow}</span> {Math.abs(priceChangePercent).toFixed(2)}%
            </span>
          </div>
          <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded ${bgClass}`}>
            <span className={`text-xs font-medium ${colorClass}`}>
              <span className="font-bold">{isPositive ? '▲' : '▼'}</span>
              {isPositive ? '+' : ''}
              {priceChange24h >= 0 ? '+' : ''}
              {priceChange24h.toFixed(4)}
            </span>
          </div>
        </div>
        <div className={`p-2.5  ${bgClass} ${colorClass}`}>
          {colorBlindMode ? (
            <span className="text-lg font-bold">{isPositive ? '▲' : '▼'}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  isPositive ? 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' : 'M13 17h8m0 0V9m0 8l-8-8-4 4-6-6'
                }
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function UpdateFrequencyCard({
  frequency,
  intervals,
}: {
  frequency: number;
  intervals: UpdateInterval[];
}) {
  const t = useTranslations();
  const [borderFlash, setBorderFlash] = useState(false);
  const prevFreqRef = useRef(frequency);

  useEffect(() => {
    if (prevFreqRef.current !== frequency) {
      setBorderFlash(true);
      const timer = setTimeout(() => setBorderFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevFreqRef.current = frequency;
  }, [frequency]);

  const maxInterval = useMemo(() => {
    if (intervals.length === 0) return 1000;
    return Math.max(...intervals.map((i) => i.interval), 100);
  }, [intervals]);

  return (
    <div
      className={`bg-white border  p-4 hover:border-gray-300 transition-all duration-200 ${borderFlash ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('kpiDashboard.updateFrequency')}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-xl md:text-2xl font-bold text-gray-900">
              {frequency.toFixed(1)}
            </span>
            <span className="text-gray-500 text-sm">{t('kpiDashboard.timesPerSecond')}</span>
          </div>
          <div className="flex items-end gap-0.5 h-8 mt-3">
            {intervals.length > 0 ? (
              intervals.map((item, index) => {
                const height = Math.max(4, (item.interval / maxInterval) * 100);
                const color =
                  item.interval < 200
                    ? 'bg-green-400'
                    : item.interval < 500
                      ? 'bg-yellow-400'
                      : 'bg-red-400';
                return (
                  <div
                    key={index}
                    className={`w-2 ${color}  transition-all duration-200`}
                    style={{ height: `${height}%` }}
                    title={`${item.interval}ms`}
                  />
                );
              })
            ) : (
              <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">
                {t('kpiDashboard.waitingForData')}
              </div>
            )}
          </div>
        </div>
        <div className="p-2.5 bg-purple-50  text-purple-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function NetworkHealthCard({
  health,
  colorBlindMode = false,
}: {
  health: 'healthy' | 'warning' | 'critical';
  colorBlindMode?: boolean;
}) {
  const t = useTranslations();
  const [borderFlash, setBorderFlash] = useState(false);
  const prevHealthRef = useRef(health);

  useEffect(() => {
    if (prevHealthRef.current !== health) {
      setBorderFlash(true);
      const timer = setTimeout(() => setBorderFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevHealthRef.current = health;
  }, [health]);

  const config = getHealthConfig(t)[health];
  const healthShape = health === 'healthy' ? '✓' : health === 'warning' ? '!' : '✕';

  return (
    <div
      className={`bg-white border  p-4 hover:border-gray-300 transition-all duration-200 ${borderFlash ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('kpiDashboard.networkHealth')}
          </p>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full  ${config.pulseColor} opacity-75`}
              ></span>
              <span className={`relative inline-flex  h-3 w-3 ${config.bgColor}`}></span>
            </span>
            <span className={`text-xl md:text-2xl font-bold ${config.textColor}`}>
              {colorBlindMode && <span className="mr-1">{healthShape}</span>}
              {config.label}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2">{t('kpiDashboard.monitoring')}</p>
        </div>
        <div className={`p-2.5  ${config.lightBg} ${config.textColor}`}>
          {colorBlindMode ? (
            <span className="text-lg font-bold">{healthShape}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function DataQualityGauge({
  score,
  colorBlindMode = false,
}: {
  score: number;
  colorBlindMode?: boolean;
}) {
  const t = useTranslations();
  const [borderFlash, setBorderFlash] = useState(false);
  const prevScoreRef = useRef(score);

  useEffect(() => {
    if (prevScoreRef.current !== score) {
      setBorderFlash(true);
      const timer = setTimeout(() => setBorderFlash(false), 600);
      return () => clearTimeout(timer);
    }
    prevScoreRef.current = score;
  }, [score]);

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = getQualityColor(score);
  const level = getQualityLevel(score, t);
  const qualityShape = score >= 90 ? '★' : score >= 70 ? '◆' : score >= 50 ? '▲' : '●';

  return (
    <div
      className={`bg-white border  p-4 hover:border-gray-300 transition-all duration-200 ${borderFlash ? 'border-blue-400 ring-2 ring-blue-200 animate-pulse' : 'border-gray-200'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">
            {t('kpiDashboard.dataQuality')}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke={baseColors.gray[200]}
                  strokeWidth="5"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke={color}
                  strokeWidth="5"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-gray-900">{Math.round(score)}</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {colorBlindMode && <span className="mr-1">{qualityShape}</span>}
                {level}
              </p>
              <p className="text-xs text-gray-400">{t('kpiDashboard.overallScore')}</p>
            </div>
          </div>
        </div>
        <div className="p-2.5 bg-cyan-50  text-cyan-600">
          {colorBlindMode ? (
            <span className="text-lg font-bold">{qualityShape}</span>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

export function KPIDashboard({
  price,
  priceChange24h,
  priceChangePercent,
  updateFrequency,
  networkHealth,
  dataQualityScore,
  className = '',
}: KPIDashboardProps) {
  const t = useTranslations();
  const [previousPrice, setPreviousPrice] = useState<number | null>(null);
  const [intervals, setIntervals] = useState<UpdateInterval[]>([]);
  const lastUpdateRef = useRef<number>(Date.now());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [colorBlindMode, setColorBlindMode] = useState(false);

  const kpiCards = useMemo(
    () => [
      {
        id: 'price',
        component: <PriceCard key="price" price={price} previousPrice={previousPrice} />,
      },
      {
        id: 'priceChange',
        component: (
          <PriceChangeCard
            key="priceChange"
            priceChange24h={priceChange24h}
            priceChangePercent={priceChangePercent}
            colorBlindMode={colorBlindMode}
          />
        ),
      },
      {
        id: 'updateFrequency',
        component: (
          <UpdateFrequencyCard
            key="updateFrequency"
            frequency={updateFrequency}
            intervals={intervals}
          />
        ),
      },
      {
        id: 'networkHealth',
        component: (
          <NetworkHealthCard
            key="networkHealth"
            health={networkHealth}
            colorBlindMode={colorBlindMode}
          />
        ),
      },
      {
        id: 'dataQuality',
        component: (
          <DataQualityGauge
            key="dataQuality"
            score={dataQualityScore}
            colorBlindMode={colorBlindMode}
          />
        ),
      },
    ],
    [
      price,
      previousPrice,
      priceChange24h,
      priceChangePercent,
      updateFrequency,
      intervals,
      networkHealth,
      dataQualityScore,
    ]
  );

  const totalPages = Math.ceil(kpiCards.length / 2);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const scrollLeft = scrollContainerRef.current.scrollLeft;
    const cardWidth = scrollContainerRef.current.offsetWidth;
    const pageIndex = Math.round(scrollLeft / cardWidth);
    setCurrentPage(pageIndex);
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const scrollToPage = useCallback((pageIndex: number) => {
    if (!scrollContainerRef.current) return;
    const cardWidth = scrollContainerRef.current.offsetWidth;
    scrollContainerRef.current.scrollTo({
      left: cardWidth * pageIndex,
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const now = Date.now();
    const interval = now - lastUpdateRef.current;

    if (previousPrice !== null) {
      setIntervals((prev) => {
        const newIntervals = [...prev, { timestamp: now, interval }];
        if (newIntervals.length > 10) {
          return newIntervals.slice(-10);
        }
        return newIntervals;
      });
    }

    setPreviousPrice(price);
    lastUpdateRef.current = now;
  }, [price]);

  return (
    <div className={className}>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setColorBlindMode(!colorBlindMode)}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium  transition-colors ${
            colorBlindMode
              ? 'bg-blue-100 text-blue-700 border border-blue-200'
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
          title={
            colorBlindMode
              ? t('kpiDashboard.colorBlindModeOff')
              : t('kpiDashboard.colorBlindModeOn')
          }
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          <span>
            {colorBlindMode
              ? t('kpiDashboard.colorBlindModeEnabled')
              : t('kpiDashboard.colorBlindMode')}
          </span>
        </button>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-6 md:gap-4 md:grid md:grid-cols-3 lg:grid-cols-5 touch-pan-x"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {kpiCards.map((card, index) => (
          <div key={card.id} className="flex-shrink-0 w-[calc(50%-0.75rem)] md:w-auto snap-start">
            {card.component}
          </div>
        ))}
      </div>
      <ScrollIndicator
        totalItems={totalPages}
        currentIndex={currentPage}
        onIndicatorClick={scrollToPage}
      />
    </div>
  );
}

export type { KPIDashboardProps };
