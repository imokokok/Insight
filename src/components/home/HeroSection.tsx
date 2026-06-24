'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ArrowRight, Search, Sparkles } from 'lucide-react';

import { useSearch } from './hooks/useSearch';

export function HeroSection() {
  const router = useRouter();
  const { searchQuery, setSearchQuery, searchResults } = useSearch();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim().toUpperCase();
    if (trimmed) {
      const directMatch = searchResults.find(
        (r) => r.item.symbol === trimmed || r.item.symbol === trimmed.replace(/USD$/i, '')
      );
      if (directMatch) {
        router.push(`/price-query?symbol=${directMatch.item.symbol}`);
      } else {
        router.push(`/price-insight?symbol=${trimmed}`);
      }
      setSearchQuery('');
    }
  };

  return (
    <section className="relative overflow-hidden bg-slate-950">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full opacity-30"
          style={{
            background:
              'radial-gradient(circle, rgba(59,130,246,0.35) 0%, rgba(37,99,235,0.12) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-[10%] -right-[20%] w-[60%] h-[60%] rounded-full opacity-25"
          style={{
            background:
              'radial-gradient(circle, rgba(139,92,246,0.35) 0%, rgba(124,58,237,0.1) 40%, transparent 70%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-20 sm:pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-medium mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Real-time oracle aggregation across 10+ providers</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] mb-6">
            Compare oracle prices.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              Build with confidence.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed mb-8 max-w-2xl">
            Insight aggregates prices from Chainlink, Pyth, RedStone, API3, DIA and more. Spot
            discrepancies, evaluate oracle health, and make data-driven decisions for your protocol.
          </p>

          <form onSubmit={onSubmit} className="relative max-w-xl mb-8">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl opacity-50 group-hover:opacity-70 transition-opacity blur-sm" />
              <div className="relative flex items-center bg-slate-900 rounded-xl border border-slate-700/50 shadow-2xl">
                <Search className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search BTC, ETH, LINK, oracle provider..."
                  className="flex-1 px-4 py-4 text-base text-white placeholder-slate-500 bg-transparent border-0 outline-none min-w-0"
                />
                <button
                  type="submit"
                  className="mr-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  Search
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </form>

          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span>Trending:</span>
            {['BTC', 'ETH', 'SOL', 'LINK', 'PYTH'].map((symbol) => (
              <Link
                key={symbol}
                href={`/price-insight?symbol=${symbol}`}
                className="px-2.5 py-1 rounded-md bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
              >
                {symbol}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade to content */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50/50 to-transparent" />
    </section>
  );
}
