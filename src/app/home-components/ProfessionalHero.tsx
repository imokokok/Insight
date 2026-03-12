'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/context';
import { ArrowRight, Search, TrendingUp, Shield, Zap, BookOpen, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

// 生成模拟趋势数据
const generateTrendData = (baseValue: number, points: number = 20) => {
  const data = [];
  let currentValue = baseValue;
  for (let i = 0; i < points; i++) {
    const change = (Math.random() - 0.48) * 0.05;
    currentValue = currentValue * (1 + change);
    data.push({ value: currentValue });
  }
  return data;
};

// 三个指标数据，包含迷你图表数据
const metrics = [
  {
    label: 'tvs',
    value: '$42.1B',
    subLabel: '总保障价值',
    icon: Shield,
    trend: generateTrendData(40),
    color: '#3b82f6',
  },
  {
    label: 'oracles',
    value: '5',
    subLabel: '活跃预言机',
    icon: Zap,
    trend: generateTrendData(5, 15),
    color: '#10b981',
  },
  {
    label: 'pairs',
    value: '1200+',
    subLabel: '支持交易对',
    icon: TrendingUp,
    trend: generateTrendData(1100, 25),
    color: '#8b5cf6',
  },
];

// 动态粒子背景组件
function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
    }> = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      particles = [];
      const particleCount = Math.min(30, Math.floor(window.innerWidth / 50));
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制粒子
      particles.forEach((particle, i) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`;
        ctx.fill();

        // 绘制连线
        particles.slice(i + 1).forEach((other) => {
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - distance / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        // 更新位置
        particle.x += particle.vx;
        particle.y += particle.vy;

        // 边界反弹
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
      });

      animationFrameId = requestAnimationFrame(drawParticles);
    };

    resizeCanvas();
    createParticles();
    drawParticles();

    window.addEventListener('resize', () => {
      resizeCanvas();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  );
}

export default function ProfessionalHero() {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const title = isZh ? '洞察预言机数据' : 'Insight Oracle Data';
  const titleHighlight = isZh ? '驱动智能决策' : 'Power Smart Decisions';

  return (
    <section className="relative min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 overflow-hidden">
      {/* Animated Particle Background */}
      <AnimatedBackground />

      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '4s' }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-pulse"
          style={{ animationDuration: '5s', animationDelay: '1s' }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-blue-100/30 to-transparent rounded-full" />
      </div>

      {/* Animated Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(#1e40af 1px, transparent 1px), linear-gradient(90deg, #1e40af 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center px-6 lg:px-12 xl:px-20 py-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Live Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-full mb-8 animate-fade-in hover:scale-105 transition-transform duration-300">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Activity className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                {isZh ? '实时数据' : 'Live Data'}
              </span>
              <span className="w-1 h-1 rounded-full bg-emerald-400/50"></span>
              <span className="text-xs text-emerald-600/70">
                {t('home.hero.badge') || '专业预言机数据平台'}
              </span>
            </div>

            {/* Title with enhanced typography */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 tracking-tight">
              {title}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 animate-gradient">
                {titleHighlight}
              </span>
            </h1>

            {/* Description with improved spacing */}
            <p className="text-lg md:text-xl text-gray-600 mb-10 leading-relaxed max-w-2xl mx-auto font-light">
              {t('home.hero.description') ||
                '全面分析和比较主流预言机协议。实时监控价格数据，评估协议性能，助力 Web3 开发者和分析师做出明智决策。'}
            </p>

            {/* Search Box with glow effect on focus */}
            <div className="max-w-2xl mx-auto mb-10">
              <div className="relative group">
                <div
                  className={`absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-2xl blur transition-all duration-500 ${
                    isSearchFocused
                      ? 'opacity-60 scale-[1.02]'
                      : 'opacity-25 group-hover:opacity-40'
                  }`}
                />
                <div
                  className={`relative flex items-center bg-white rounded-2xl shadow-xl shadow-blue-900/5 border overflow-hidden transition-all duration-300 ${
                    isSearchFocused ? 'border-blue-400 shadow-blue-500/20' : 'border-gray-200/50'
                  }`}
                >
                  <div className="pl-6">
                    <Search
                      className={`w-5 h-5 transition-colors duration-300 ${isSearchFocused ? 'text-blue-500' : 'text-gray-400'}`}
                    />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setIsSearchFocused(false)}
                    placeholder={
                      isZh
                        ? '搜索交易对、预言机或区块链...'
                        : 'Search trading pairs, oracles, or blockchains...'
                    }
                    className="flex-1 px-4 py-5 text-base text-gray-900 placeholder-gray-400 bg-transparent outline-none"
                  />
                  <button className="mr-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300">
                    {isZh ? '搜索' : 'Search'}
                  </button>
                </div>
              </div>
            </div>

            {/* CTA Buttons - Primary and Secondary */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link
                href="/price-query"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                {t('home.hero.ctaPrimary') || '开始探索'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/80 backdrop-blur-sm text-gray-700 font-semibold rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <BookOpen className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" />
                {isZh ? '查看文档' : 'View Documentation'}
              </Link>
            </div>

            {/* Metrics Grid - 3 columns with enhanced mini charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {metrics.map((metric, index) => {
                const Icon = metric.icon;
                const isPositive =
                  metric.trend[metric.trend.length - 1].value >= metric.trend[0].value;
                const percentChange =
                  (metric.trend[metric.trend.length - 1].value / metric.trend[0].value - 1) * 100;

                return (
                  <div
                    key={metric.label}
                    className="group bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 p-5 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1.5 hover:border-blue-200 transition-all duration-300"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: 'fadeInUp 0.6s ease-out forwards',
                      opacity: 0,
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2.5 rounded-xl transition-all duration-300 group-hover:scale-110"
                          style={{ backgroundColor: `${metric.color}15` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: metric.color }} />
                        </div>
                        <span className="text-sm font-medium text-gray-500">{metric.subLabel}</span>
                      </div>
                      <div
                        className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                          isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                        }`}
                      >
                        <TrendingUp className={`w-3 h-3 ${!isPositive && 'rotate-180'}`} />
                        <span>
                          {isPositive ? '+' : ''}
                          {percentChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-3 tracking-tight">
                      {metric.value}
                    </div>
                    {/* Enhanced Mini Trend Chart */}
                    <div className="h-12 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metric.trend}>
                          <defs>
                            <linearGradient
                              id={`gradient-${metric.label}`}
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop offset="5%" stopColor={metric.color} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={metric.color} stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <Area
                            type="monotone"
                            dataKey="value"
                            stroke={metric.color}
                            strokeWidth={2.5}
                            fill={`url(#gradient-${metric.label})`}
                            dot={false}
                            animationDuration={1500}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 8s ease infinite;
        }
      `}</style>
    </section>
  );
}
