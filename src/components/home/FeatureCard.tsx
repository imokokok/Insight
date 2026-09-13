import Link from 'next/link';

import { ArrowRight } from 'lucide-react';

type ModuleGlyph = 'layers' | 'fault' | 'seal';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  glyph: ModuleGlyph;
  className?: string;
  tags?: string[];
  index?: string;
}

export function FeatureCard({
  title,
  description,
  href,
  glyph,
  className = '',
  tags = [],
  index,
}: FeatureCardProps) {
  return (
    <div
      className={`feature-module transition-transform duration-200 ease-out hover:-translate-y-[3px] ${className}`}
    >
      <Link
        href={href}
        className="group relative flex h-full min-h-[24rem] flex-col overflow-hidden border border-slate-900/12 bg-white/35 p-6 transition-all duration-300 hover:border-blue-500/45 hover:bg-white/70 lg:p-8"
      >
        <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
        {index ? (
          <div className="mb-5 flex items-center justify-between font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            <span>Module</span>
            <span className="text-blue-700">{index}</span>
          </div>
        ) : null}
        <div className={`module-glyph module-glyph-${glyph}`} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="max-w-xs text-2xl font-semibold tracking-[-0.045em] text-slate-950">
            {title}
          </h3>
        </div>
        <p className="mb-6 max-w-sm flex-1 text-sm leading-relaxed text-slate-600">{description}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="border-b border-slate-900/10 px-1 py-0.5 text-xs font-medium text-slate-500 transition-colors group-hover:border-blue-200 group-hover:text-blue-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-blue-600 transition-colors group-hover:text-blue-700">
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </div>
  );
}
