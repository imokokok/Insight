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
      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-violet-500 rounded-xl opacity-50 group-hover:opacity-70 transition-opacity blur-sm" />
        <div className="relative flex items-center bg-slate-900 rounded-xl border border-slate-700/50 shadow-2xl">
          <Search className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search BTC, ETH, LINK, UNI, or an oracle provider..."
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
  );
}
