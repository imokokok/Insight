import Link from 'next/link';

import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp } from 'lucide-react';

export function UseCaseBanner() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800"
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Top glow line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          {/* Left: key figures */}
          <div className="flex items-center gap-4 sm:gap-6 lg:flex-shrink-0">
            <div className="text-center lg:text-left">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold font-mono text-gradient-primary tracking-tight">
                2.85%
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Oracle deviation</div>
            </div>
            <div className="w-px h-14 bg-slate-700 hidden sm:block" />
            <div className="text-center lg:text-left">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-bold font-mono text-white tracking-tight">
                $26M
              </div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1">Unfair liquidations</div>
            </div>
          </div>

          {/* Right: narrative + CTA */}
          <div className="flex-1">
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Risk Brief</span>
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-white mb-2 leading-tight">
              Oracle deviation can liquidate healthy positions
            </h2>
            <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-5 max-w-2xl">
              On March 10, 2026, a 2.85% wstETH oracle mismatch caused ~$26M in unfair liquidations.
              Insight&apos;s Safety Check exposes these deviations before they hit your positions.
            </p>
            <Link
              href="/safety-check"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-slate-600 text-slate-200 hover:text-white hover:border-slate-400 hover:bg-slate-800 rounded-xl font-medium transition-all duration-200"
            >
              Run Safety Check
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
