'use client';

import AdvancedCard, {
  AdvancedCardHeader,
  AdvancedCardTitle,
  AdvancedCardContent,
} from '@/components/AdvancedCard';
import StatCard from '@/components/StatCard';
import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/context';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const priceFeedData = [
  { time: '00:00', BTC: 68000, ETH: 3500, SOL: 180 },
  { time: '04:00', BTC: 68120, ETH: 3515, SOL: 181 },
  { time: '08:00', BTC: 68050, ETH: 3508, SOL: 180.5 },
  { time: '12:00', BTC: 68200, ETH: 3520, SOL: 182 },
  { time: '16:00', BTC: 68150, ETH: 3518, SOL: 181.5 },
  { time: '20:00', BTC: 68250, ETH: 3525, SOL: 182.5 },
  { time: '24:00', BTC: 68300, ETH: 3530, SOL: 183 },
];

const networkStatsData = [
  { name: 'Ethereum', value: 65 },
  { name: 'Arbitrum', value: 20 },
  { name: 'Polygon', value: 15 },
];

const securityMetrics = [
  { name: '去中心化程度', value: 95 },
  { name: '节点安全性', value: 92 },
  { name: '数据完整性', value: 88 },
  { name: '响应速度', value: 90 },
];

const COLORS = ['#1e40af', '#3b82f6', '#6366f1', '#8b5cf6'];
const LINE_COLORS = {
  BTC: '#f59e0b',
  ETH: '#3b82f6',
  SOL: '#8b5cf6',
};

const BAR_COLORS = ['#1e40af', '#3b82f6', '#10b981', '#8b5cf6'];

export default function Api3Page() {
  const { t } = useI18n();
  const [currentPrice, setCurrentPrice] = useState({
    BTC: 68300,
    ETH: 3530,
    SOL: 183,
    API3: 2.8,
  });

  const features = useMemo(
    () => [
      {
        title: t('api3.features.firstPartyOracles'),
        description: t('api3.features.firstPartyOraclesDesc'),
        icon: '🔒',
        gradient: 'from-blue-500 to-cyan-400',
        bgColor: 'bg-blue-50',
      },
      {
        title: t('api3.features.airnode'),
        description: t('api3.features.airnodeDesc'),
        icon: '✈️',
        gradient: 'from-purple-500 to-pink-400',
        bgColor: 'bg-purple-50',
      },
      {
        title: t('api3.features.decentralizedApiConnectivity'),
        description: t('api3.features.decentralizedApiConnectivityDesc'),
        icon: '🔗',
        gradient: 'from-green-500 to-emerald-400',
        bgColor: 'bg-green-50',
      },
      {
        title: t('api3.features.quantifiableSecurity'),
        description: t('api3.features.quantifiableSecurityDesc'),
        icon: '📊',
        gradient: 'from-orange-500 to-amber-400',
        bgColor: 'bg-orange-50',
      },
    ],
    [t]
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice((prev) => ({
        BTC: prev.BTC + (Math.random() - 0.5) * 100,
        ETH: prev.ETH + (Math.random() - 0.5) * 5,
        SOL: prev.SOL + (Math.random() - 0.5) * 0.5,
        API3: prev.API3 + (Math.random() - 0.5) * 0.05,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
        <header className="mb-10 sm:mb-16 animate-fade-in">
          <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-700 to-blue-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-xl">
              🔗
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
                {t('api3.title')}
              </h1>
              <p className="text-base sm:text-lg text-gray-600 mt-1 sm:mt-2">
                {t('api3.subtitle')}
              </p>
            </div>
          </div>
          <div className="h-1 w-20 sm:w-24 bg-gradient-to-r from-blue-700 to-blue-500 rounded-full"></div>
        </header>

        <section className="mb-10 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Object.entries(currentPrice).map(([symbol, price], index) => {
              const iconMap: Record<string, string> = {
                BTC: '₿',
                ETH: 'Ξ',
                SOL: '◎',
                API3: '🔗',
              };
              const colorMap: Record<
                string,
                'blue' | 'purple' | 'green' | 'orange' | 'red' | 'cyan'
              > = {
                BTC: 'orange',
                ETH: 'blue',
                SOL: 'purple',
                API3: 'cyan',
              };
              const fixedPrice = price.toFixed(symbol === 'API3' ? 2 : symbol === 'SOL' ? 1 : 0);
              return (
                <StatCard
                  key={symbol}
                  title={`${symbol}/USD`}
                  value={fixedPrice}
                  prefix="$"
                  icon={<span className="text-xl sm:text-2xl">{iconMap[symbol]}</span>}
                  trend={0.24}
                  trendDirection="up"
                  accentColor={colorMap[symbol]}
                  variant={index === 0 ? 'accent' : 'default'}
                  className="hover-lift"
                />
              );
            })}
          </div>
        </section>

        <section className="mb-10 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
            <div className="w-1.5 sm:w-2 h-6 sm:h-8 bg-gradient-to-b from-blue-700 to-blue-400 rounded-full"></div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {t('api3.uniqueFeatures')}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl sm:rounded-3xl transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 sm:hover:-translate-y-2 cursor-pointer"
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className={`absolute inset-0 ${feature.bgColor} opacity-90`}></div>
                <div className="relative p-6 sm:p-8">
                  <div className="flex items-start gap-4 sm:gap-6">
                    <div
                      className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white text-2xl sm:text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300`}
                    >
                      {feature.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3 group-hover:text-blue-700 transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`absolute bottom-0 left-0 h-1 bg-gradient-to-r ${feature.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 sm:mb-12 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
            <AdvancedCard className="lg:col-span-2" variant="glass" hoverable={false}>
              <AdvancedCardHeader className="border-gray-200/50">
                <AdvancedCardTitle className="text-gray-900">
                  {t('api3.priceFeeds')}
                </AdvancedCardTitle>
              </AdvancedCardHeader>
              <AdvancedCardContent>
                <div className="h-72 sm:h-80 lg:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={priceFeedData}
                      margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                    >
                      <defs>
                        {Object.entries(LINE_COLORS).map(([key, color]) => (
                          <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="6 6" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="time"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${Number(value).toLocaleString()}`}
                        stroke="#9ca3af"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          border: '1px solid #f0f0f0',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-finance-medium)',
                          padding: '12px 16px',
                          backdropFilter: 'blur(10px)',
                        }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                        labelFormatter={(label) => label}
                        cursor={{ stroke: '#e5e7eb', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Legend
                        wrapperStyle={{
                          paddingTop: '20px',
                          display: 'flex',
                          justifyContent: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                        iconType="circle"
                        iconSize={8}
                      />
                      {Object.entries(LINE_COLORS).map(([key, color]) => (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          name={key}
                          stroke={color}
                          strokeWidth={2.5}
                          dot={{ r: 3.5, strokeWidth: 2, fill: '#ffffff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          fill={`url(#color${key})`}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </AdvancedCardContent>
            </AdvancedCard>

            <AdvancedCard variant="default" hoverable={false}>
              <AdvancedCardHeader className="border-gray-100">
                <AdvancedCardTitle>{t('api3.networkDistribution')}</AdvancedCardTitle>
              </AdvancedCardHeader>
              <AdvancedCardContent>
                <div className="h-72 sm:h-80 lg:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {COLORS.map((color, index) => (
                          <linearGradient
                            key={`pieGrad${index}`}
                            id={`pieGrad${index}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.8} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={networkStatsData}
                        cx="50%"
                        cy="45%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={70}
                        innerRadius={40}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {networkStatsData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`url(#pieGrad${index})`}
                            stroke="white"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #f0f0f0',
                          borderRadius: '12px',
                          boxShadow: 'var(--shadow-finance-medium)',
                          padding: '12px 16px',
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={48}
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ paddingBottom: '10px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </AdvancedCardContent>
            </AdvancedCard>
          </div>
        </section>

        <section className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
          <AdvancedCard variant="default" hoverable={false}>
            <AdvancedCardHeader className="border-gray-100">
              <AdvancedCardTitle>{t('api3.quantifiableSecurityMetrics')}</AdvancedCardTitle>
            </AdvancedCardHeader>
            <AdvancedCardContent>
              <div className="h-72 sm:h-80 lg:h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={securityMetrics}
                    margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  >
                    <defs>
                      {BAR_COLORS.map((color, index) => (
                        <linearGradient
                          key={`barGrad${index}`}
                          id={`barGrad${index}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={color} stopOpacity={1} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="6 6" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#9ca3af"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      dy={8}
                      interval={0}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="#9ca3af"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #f0f0f0',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-finance-medium)',
                        padding: '12px 16px',
                      }}
                      formatter={(value) => [`${value}分`, '安全评分']}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={48}>
                      {securityMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#barGrad${index})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </AdvancedCardContent>
          </AdvancedCard>
        </section>
      </div>
    </div>
  );
}
