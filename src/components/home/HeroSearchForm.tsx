'use client';

import { useRouter } from 'next/navigation';

import { ArrowRight, Search } from 'lucide-react';

import { useSearch } from './hooks/useSearch';

export function HeroSearchForm() {
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
    <form onSubmit={onSubmit} className="relative max-w-xl mb-6">
      <div className="relative group border border-slate-900/15 bg-white/75 shadow-[0_14px_32px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-colors focus-within:border-blue-600/50">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-500 ml-4 flex-shrink-0" />
          <input
            type="text"
            aria-label="Search an asset or oracle provider"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search BTC, ETH, LINK, UNI, or an oracle provider..."
            className="flex-1 px-4 py-4 text-base text-slate-950 placeholder-slate-400 bg-transparent border-0 outline-none min-w-0"
          />
          <button
            type="submit"
            className="mr-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold transition-colors flex items-center gap-2"
          >
            Search
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
