import Image from 'next/image';
import Link from 'next/link';

import { motion, type Variants } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';

import { HeroSearchForm } from './HeroSearchForm';

const trendingSymbols = ['BTC', 'ETH', 'SOL', 'LINK', 'UNI'];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-950">
      {/* Background image */}
      <div className="absolute inset-0 animate-slow-drift">
        <Image
          src="/hero-bg.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ filter: 'saturate(0.5) brightness(0.68)' }}
        />
      </div>

      {/* Refined overlays */}
      <div className="absolute inset-0 hero-overlay-readability" />
      <div className="absolute inset-0 hero-grid-overlay opacity-40" />
      <div className="absolute inset-0 hero-vignette" />

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36 lg:pt-32 lg:pb-44">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-3xl"
        >
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wide mb-6 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Oracle Transparency & Risk Infrastructure for DeFi</span>
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.05] mb-6"
          >
            Make oracle risk
            <br />
            <span className="text-gradient-primary">transparent before it strikes.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8 max-w-2xl"
          >
            Insight is independent oracle transparency and risk infrastructure for DeFi. Verify,
            compare, and stress-test prices across Chainlink, RedStone, API3 and more — so faulty
            feeds never take your protocol by surprise. Give your AI agents a pre-trade oracle
            safety checkpoint before they execute a single on-chain trade, plus an always-on Oracle
            Watch signal to keep running strategies safe between trades.
          </motion.p>

          <motion.div variants={itemVariants}>
            <HeroSearchForm />
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3 mb-10">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-900/20 hover:shadow-blue-900/30 hover:-translate-y-0.5"
            >
              Start building free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/safety-check"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-slate-200 hover:text-white hover:bg-white/10 hover:border-white/20 rounded-xl font-semibold backdrop-blur-sm transition-all duration-200"
            >
              Explore risk tools
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500 mr-1">Trending:</span>
            {trendingSymbols.map((symbol) => (
              <Link
                key={symbol}
                href={`/price-insight?symbol=${symbol}`}
                className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-slate-300 text-sm font-medium hover:text-white hover:border-white/20 hover:bg-white/10 transition-all duration-200"
              >
                {symbol}
              </Link>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
          Scroll to explore
        </span>
        <div className="w-8 h-12 rounded-full border-2 border-slate-500/40 flex items-start justify-center p-1.5">
          <motion.div
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-1.5 h-1.5 rounded-full bg-blue-400"
          />
        </div>
        <ChevronDown className="w-4 h-4 text-slate-500 animate-bounce-slow" />
      </motion.div>
    </section>
  );
}
