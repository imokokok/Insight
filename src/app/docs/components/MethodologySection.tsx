'use client';

import { motion } from 'framer-motion';
import {
  BookOpen,
  CheckCircle,
  Gauge,
  Layers,
  Scale,
  ShieldCheck,
  Timer,
  TrendingUp,
} from 'lucide-react';

const consensusMethods = [
  {
    key: 'median',
    title: 'Median',
    bestFor: 'Micro-cap / low-liquidity assets',
    description:
      'Middle value of sorted prices. Robust against extreme outliers when provider coverage is limited.',
  },
  {
    key: 'trimmed_mean',
    title: 'Trimmed Mean',
    bestFor: 'Altcoins',
    description:
      'Mean after removing the top and bottom 25% of prices. Balances outlier resistance with responsiveness.',
  },
  {
    key: 'weighted_median',
    title: 'Weighted Median',
    bestFor: 'Major assets',
    description:
      'Median weighted by provider confidence (40%), price freshness (35%), and confidence-interval tightness (25%).',
  },
  {
    key: 'iqr_filtered',
    title: 'IQR Filtered',
    bestFor: 'Stablecoins',
    description:
      'Removes outliers outside the interquartile range, then takes the median. Ideal for tight peg tracking.',
  },
];

const reputationMetrics = [
  {
    title: 'Accuracy',
    weight: '30%',
    description:
      "Measures how close a provider's price is to the consensus. Scored as 100 − min(|deviation| × 15, 85), with a consistency bonus for low deviation variance.",
  },
  {
    title: 'Uptime',
    weight: '20%',
    description:
      'Percentage of successful price fetches over a 7-day rolling window. Failed fetches are classified by failure mode for debugging.',
  },
  {
    title: 'Reliability',
    weight: '20%',
    description:
      'Penalizes large deviations more aggressively than Accuracy (100 − min(|deviation| × 20, 80)). Same consistency bonus applies.',
  },
  {
    title: 'Freshness',
    weight: '15%',
    description:
      'Scores how recently the on-chain / API data was updated. Degrades by 4 points per minute of stale data, capped at 90 points lost.',
  },
  {
    title: 'Latency',
    weight: '10%',
    description:
      'Response time against a provider-type baseline: on-chain providers typically get ~1,000 ms, API providers ~350–500 ms.',
  },
  {
    title: 'Deviation',
    weight: '5%',
    description:
      'Average absolute deviation from consensus, bucketed into 0.1%, 0.5%, 1%, 2%, and >2% tiers.',
  },
];

const validationRules = [
  'Price must be a positive finite number',
  'Timestamp must be within a reasonable window',
  'Confidence interval width must be parsable when provided',
  'Provider-reported confidence score is preserved for weighting',
  'Failures are classified into failure modes (stale, fallback, network, unsupported, etc.)',
];

const collectionItems = [
  { label: 'Feed resolution', value: 'Database-first with 5-minute cache' },
  { label: 'On-chain data', value: 'Direct RPC calls to oracle contracts' },
  { label: 'API data', value: 'Signed RedStone / DIA / Supra endpoints' },
  { label: 'Fallback', value: 'Hard-coded symbol lists when DB is unreachable' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const easeOutExpo = [0.16, 1, 0.3, 1] as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOutExpo },
  },
};

function SectionCard({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={itemVariants}
      className={`bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm ${className}`}
    >
      {children}
    </motion.div>
  );
}

export default function MethodologySection() {
  return (
    <section id="methodology" className="py-16 sm:py-20 scroll-mt-20 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5, ease: easeOutExpo }}
          className="mb-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <BookOpen className="w-6 h-6 text-emerald-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Methodology
            </h2>
          </div>
          <p className="text-slate-600 leading-relaxed max-w-3xl">
            Insight combines hourly oracle data with rigorous validation, multi-algorithm consensus,
            and a 7-day rolling reputation framework to produce reliable cross-provider price
            intelligence.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-6"
        >
          {/* Data collection */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Data Collection</h3>
            </div>
            <p className="text-slate-600 leading-relaxed mb-5">
              Prices are fetched from 11 oracle providers across 40+ blockchains. Each request reads
              either an on-chain contract or a verified API endpoint, then normalizes the result
              into a common{' '}
              <code className="text-sm bg-slate-100 px-1.5 py-0.5 rounded">PriceData</code>{' '}
              structure that includes price, timestamp, decimals, confidence, and verification
              metadata.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {collectionItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                >
                  <span className="text-sm text-slate-500">{item.label}</span>
                  <span className="text-sm font-medium text-slate-900 text-right">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Validation */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Validation Rules</h3>
            </div>
            <p className="text-slate-600 leading-relaxed mb-5">
              Every raw price is validated before entering consensus or storage. Failures are not
              silently dropped; they are classified so the reputation system can distinguish between
              stale data, network errors, unsupported symbols, and fallback metadata.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {validationRules.map((rule) => (
                <li key={rule} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-700 leading-relaxed">{rule}</span>
                </li>
              ))}
            </ul>
          </SectionCard>

          {/* Consensus */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-violet-50 rounded-lg">
                <Scale className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Consensus Algorithms</h3>
            </div>
            <p className="text-slate-600 leading-relaxed mb-6">
              Four consensus methods are computed for every symbol. The recommended method is chosen
              automatically based on asset category: stablecoins, major assets, altcoins, and
              micro-cap assets each get the method best suited to their typical volatility and
              provider coverage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {consensusMethods.map((method) => (
                <div
                  key={method.key}
                  className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 hover:bg-slate-50 hover:border-violet-200 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{method.title}</h4>
                    <span className="text-xs font-medium px-2.5 py-1 bg-violet-100 text-violet-700 rounded-full">
                      {method.bestFor}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{method.description}</p>
                </div>
              ))}
            </div>

            <div className="p-5 bg-violet-50 rounded-xl border border-violet-100">
              <h4 className="font-semibold text-violet-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Outlier Detection
              </h4>
              <p className="text-sm text-violet-800 leading-relaxed">
                Outliers are detected using Z-score over 2.5 standard deviations, dual-source
                arbitration when only two prices exist, and history-aware checks against the last 10
                consensus points. Excluded providers are surfaced in the divergence UI and used to
                adjust confidence scoring.
              </p>
            </div>
          </SectionCard>

          {/* Reputation */}
          <SectionCard>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Gauge className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Reputation Scoring</h3>
            </div>
            <p className="text-slate-600 leading-relaxed mb-6">
              Provider reputation is recomputed hourly from a 7-day rolling window of sampled price
              fetches. Each provider is benchmarked against a latency baseline that depends on
              whether it is an on-chain or API provider, so slower on-chain calls are not unfairly
              penalized.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {reputationMetrics.map((metric) => (
                <div
                  key={metric.title}
                  className="border border-slate-100 rounded-xl p-5 hover:shadow-sm hover:border-amber-200 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-slate-900">{metric.title}</h4>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {metric.weight}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{metric.description}</p>
                </div>
              ))}
            </div>
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <Timer className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                A sample-size factor (0.85–1.0) is applied when fewer than 100 samples exist, and a
                consistency bonus of up to 4 points rewards providers with low deviation variance
                across at least 5 successful consensus comparisons.
              </p>
            </div>
          </SectionCard>
        </motion.div>
      </div>
    </section>
  );
}
