'use client';

import { motion } from 'framer-motion';
import { Database, Globe } from 'lucide-react';

const providers = [
  { name: 'Chainlink', type: 'On-chain', chains: 'EVM L1s & L2s' },
  { name: 'API3', type: 'On-chain dAPIs', chains: 'Ethereum, Arbitrum, Base, Polygon, others' },
  { name: 'RedStone', type: 'API / On-chain', chains: 'EVM L1s & L2s' },
  { name: 'DIA', type: 'API / On-chain', chains: 'EVM L1s & L2s' },
  { name: 'WINkLink', type: 'On-chain', chains: 'TRON' },
  { name: 'Supra', type: 'API / On-chain', chains: 'EVM, Move, Cosmos ecosystems' },
  { name: 'TWAP', type: 'On-chain', chains: 'DEX TWAP oracles' },
  { name: 'Reflector', type: 'On-chain', chains: 'Stellar / Soroban' },
  { name: 'Flare', type: 'On-chain', chains: 'Flare Network' },
  { name: 'Switchboard', type: 'API / On-chain', chains: 'EVM, Solana, Sui, Aptos (Crossbar)' },
];

const highlights = [
  { label: 'Oracle Providers', value: '10+' },
  { label: 'Supported Chains', value: '40+' },
  { label: 'Data Type', value: 'On-chain & API' },
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

export default function DataSourcesSection() {
  return (
    <section id="data-sources" className="py-16 sm:py-20 scroll-mt-20 border-t border-slate-100">
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
            <div className="border border-amber-200 bg-amber-100 p-2.5">
              <Database className="w-6 h-6 text-amber-600" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Data Sources
            </h2>
          </div>
          <p className="text-slate-600 leading-relaxed max-w-3xl">
            Insight aggregates price data from leading oracle providers across 40+ blockchain
            networks, normalizing every feed into a common format for comparison and analysis.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="space-y-6"
        >
          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highlights.map((item) => (
              <motion.div
                key={item.label}
                variants={itemVariants}
                className="flex items-center gap-4 border-b border-slate-900/10 bg-white/55 p-5 transition-colors last:border-b-0 hover:bg-amber-50/30"
              >
                <div className="flex h-12 w-12 items-center justify-center border border-amber-200 bg-amber-50 text-amber-600">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{item.value}</div>
                  <div className="text-sm text-slate-500">{item.label}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Providers table */}
          <motion.div
            variants={itemVariants}
            className="overflow-hidden border-y border-slate-900/15 bg-white/55"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Chains
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {providers.map((provider) => (
                    <tr key={provider.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {provider.name}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                            provider.type.includes('API')
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {provider.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{provider.chains}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Verification note */}
          <motion.div
            variants={itemVariants}
            className="border-l-2 border-blue-600 bg-blue-50/70 p-6"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-amber-200 bg-white text-amber-600">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">On-chain verification</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Every on-chain feed includes contract addresses and explorer links so you can
                  verify the source directly. API feeds are labeled as API Verified and include the
                  source display name.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
