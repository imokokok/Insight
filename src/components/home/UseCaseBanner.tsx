import Link from 'next/link';

import { ArrowRight, ShieldAlert } from 'lucide-react';

export function UseCaseBanner() {
  return (
    <section className="home-view-reveal relative overflow-hidden border border-slate-900/15 bg-[#eaf1fb]">
      <div
        className="absolute inset-0 opacity-[0.3]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(37,99,235,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(37,99,235,0.16) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border-[28px] border-blue-600/15" />

      <div className="relative p-6 sm:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
          <div className="flex items-center gap-4 sm:gap-6 lg:flex-shrink-0">
            <div className="text-center lg:text-left">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-semibold font-mono text-blue-700 tracking-tight">
                BEFORE
              </div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">execution</div>
            </div>
            <div className="w-px h-14 bg-slate-900/15 hidden sm:block" />
            <div className="text-center lg:text-left">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-semibold font-mono text-slate-950 tracking-tight">
                NOT AFTER
              </div>
              <div className="text-xs sm:text-sm text-slate-600 mt-1">an incident</div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 text-blue-700 text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Risk scenario</span>
            </div>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-slate-950 mb-2 leading-tight">
              A small oracle deviation can become a large execution outcome.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-5 max-w-2xl">
              Model deviation against your protocol&apos;s thresholds and see how a changed oracle
              value could affect a position before a risk engine has to react.
            </p>
            <Link
              href="/safety-check"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-950 text-white hover:bg-blue-700 font-medium transition-all duration-200"
            >
              Run Safety Check
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
