import Link from 'next/link';

import { ArrowRight, BookOpen } from 'lucide-react';

export default function HeroContent() {
  return (
    <>
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50/80 rounded-full">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-sm font-medium text-emerald-700">{'home.hero.liveData'}</span>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
          {'home.hero.title.part1'}
        </h1>
        <p className="text-xl sm:text-2xl text-gray-600 font-medium">{'home.hero.title.part2'}</p>
      </div>

      <p className="text-base sm:text-lg text-gray-600 leading-relaxed max-w-lg mx-auto">
        {'home.hero.description'}
      </p>

      <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
        <span>{'home.hero.stats.oracles'}</span>
        <span className="w-1 h-1 bg-gray-300 rounded-full" />
        <span>{'home.hero.stats.dataSources'}</span>
        <span className="w-1 h-1 bg-gray-300 rounded-full" />
        <span>{'home.hero.stats.realtime'}</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <Link
          href={`/en/price-query`}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors duration-200 group rounded-lg"
        >
          {'home.hero.ctaPrimary'}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
        </Link>
        <Link
          href={`/en/docs`}
          className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-gray-700 font-semibold border border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200 group rounded-lg"
        >
          <BookOpen className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition-colors duration-200" />
          {'home.hero.ctaSecondary'}
        </Link>
      </div>
    </>
  );
}
