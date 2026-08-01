'use client';

import { motion } from 'framer-motion';
import { AlertCircle, ShieldAlert, TrendingUp } from 'lucide-react';

import { RISK_LEVELS } from '@/lib/risk/constants';
import type { RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';

interface RiskSummaryStat {
  id: string;
  label: string;
  value: string;
  subtext?: string;
  level?: RiskLevel;
  icon: 'alert' | 'deviation' | 'protocols';
}

interface RiskTrackerHeroProps {
  title: string;
  description: string;
  eyebrow?: string;
  icon: React.ReactNode;
  stats: RiskSummaryStat[];
  className?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

function getStatIcon(icon: RiskSummaryStat['icon']) {
  switch (icon) {
    case 'alert':
      return <AlertCircle className="w-4 h-4" />;
    case 'deviation':
      return <TrendingUp className="w-4 h-4" />;
    case 'protocols':
      return <ShieldAlert className="w-4 h-4" />;
  }
}

function getLevelStyles(level?: RiskLevel) {
  if (!level) return 'bg-white border-slate-200 text-slate-600';
  const config = RISK_LEVELS[level];
  return cn(config.bg, config.border, config.color);
}

export function RiskTrackerHero({
  title,
  description,
  eyebrow = 'Risk Surveillance',
  icon,
  stats,
  className,
}: RiskTrackerHeroProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-gradient-to-br from-blue-50/80 via-slate-50/60 to-white border-b border-slate-200',
        className
      )}
    >
      {/* Abstract gradient orbs */}
      <div
        className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.12) 0%, rgba(59,130,246,0.04) 40%, transparent 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle, rgba(139,92,246,0.1) 0%, rgba(139,92,246,0.03) 40%, transparent 70%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #94a3b8 1px, transparent 1px), linear-gradient(to bottom, #94a3b8 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-10 sm:pt-14 sm:pb-14">
        <motion.div
          className="max-w-5xl"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 text-xs font-medium mb-5 shadow-sm"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{eyebrow}</span>
          </motion.div>

          <motion.div variants={itemVariants} className="flex items-start gap-4 mb-5">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 text-blue-600 hidden sm:flex">
              {icon}
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.1]">
                {title}
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-3xl mt-2">
                {description}
              </p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
            {stats.map((stat) => (
              <div
                key={stat.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm min-w-[140px]',
                  stat.id === 'alerts' && stat.level
                    ? getLevelStyles(stat.level)
                    : 'bg-white/80 backdrop-blur-sm border-slate-200'
                )}
              >
                <div
                  className={cn(
                    'p-1.5 rounded-lg',
                    stat.id === 'alerts'
                      ? stat.level && stat.level !== 'normal'
                        ? RISK_LEVELS[stat.level].bg
                        : 'bg-emerald-50'
                      : 'bg-slate-50'
                  )}
                >
                  {getStatIcon(stat.icon)}
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                  <div className="text-lg font-bold text-slate-900 leading-tight">{stat.value}</div>
                  {stat.subtext && (
                    <div className="text-[10px] text-slate-400 mt-0.5">{stat.subtext}</div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
