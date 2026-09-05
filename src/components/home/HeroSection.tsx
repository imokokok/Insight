import Image from 'next/image';
import Link from 'next/link';

import { motion, type Variants } from 'framer-motion';
import { ArrowDown, ArrowRight, Check } from 'lucide-react';

import { HeroSearchForm } from './HeroSearchForm';

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
    <section className="ice-hero relative isolate overflow-hidden bg-[#f8f7f4]">
      <Image
        src="/design-concepts/insight-blue-glacier-home-sample-v5.png"
        alt="A cobalt-blue glacier cross-section in a sunlit gallery"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[67%_center]"
      />
      <div className="ice-hero-wash absolute inset-0" />
      <div className="ice-hero-grain absolute inset-0" />

      <div className="relative mx-auto max-w-[1440px] px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28 lg:px-12 lg:pb-36 lg:pt-36">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-xl"
        >
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
              <span className="h-px w-10 bg-blue-600" />
              01 — Observe the signal
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-7 text-[2.65rem] font-semibold leading-[0.96] tracking-[-0.065em] text-slate-950 sm:text-6xl lg:text-7xl xl:text-[5.4rem]"
          >
            See the price
            <br />
            <span className="text-blue-700">before it becomes risk.</span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-7 max-w-lg text-base leading-relaxed text-slate-700 sm:text-lg"
          >
            Insight makes the price data beneath your protocol inspectable: compare independent
            oracle feeds, test deviation before execution, and retain a receipt anyone can verify.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-8">
            <HeroSearchForm />
          </motion.div>

          <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-3">
            <Link
              href="/price-query"
              className="inline-flex items-center gap-2 bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Inspect a price
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/safety-check"
              className="inline-flex items-center gap-2 border border-slate-900/20 bg-white/45 px-5 py-3 text-sm font-semibold text-slate-800 backdrop-blur-sm transition-all duration-200 hover:border-blue-600 hover:bg-white/80"
            >
              Run a safety check
            </Link>
            <Link
              href="/sdk"
              className="hidden items-center gap-2 px-2 py-3 text-sm font-semibold text-slate-700 transition-colors hover:text-blue-700 sm:inline-flex"
            >
              Build with Guard SDK
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-900/15 pt-5 text-xs text-slate-600"
          >
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-700" /> Cross-source consensus
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-700" /> Signed receipts
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-blue-700" /> Pre-trade safety
            </span>
          </motion.div>
        </motion.div>

        <div className="absolute bottom-7 right-5 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 sm:flex sm:right-8 lg:right-12">
          Scroll to examine <ArrowDown className="h-3.5 w-3.5" />
        </div>
      </div>
    </section>
  );
}
