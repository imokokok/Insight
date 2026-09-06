import Link from 'next/link';

import { ArrowRight, type LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  size?: 'large' | 'medium' | 'small';
  className?: string;
  tags?: string[];
}

export function FeatureCard({
  title,
  description,
  href,
  icon: Icon,
  size = 'medium',
  className = '',
  tags = [],
}: FeatureCardProps) {
  const sizeStyles = {
    large: 'p-5 lg:p-6',
    medium: 'p-4 lg:p-5',
    small: 'p-4 lg:p-5',
  };

  const iconSizes = {
    large: 'w-5 h-5',
    medium: 'w-4 h-4',
    small: 'w-4 h-4',
  };

  const iconContainerSizes = {
    large: 'w-10 h-10 mb-4',
    medium: 'w-9 h-9 mb-3',
    small: 'w-9 h-9 mb-3',
  };

  const titleSizes = {
    large: 'text-base lg:text-lg',
    medium: 'text-sm lg:text-base',
    small: 'text-sm lg:text-base',
  };

  return (
    <div
      className={`transition-transform duration-200 ease-out hover:-translate-y-[3px] ${className}`}
    >
      <Link
        href={href}
        className={`group relative flex h-full flex-col overflow-hidden border border-slate-900/12 bg-white/35 transition-all duration-300 hover:border-blue-500/45 hover:bg-white/70 ${sizeStyles[size]}`}
      >
        <div className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-blue-600 via-blue-400 to-transparent transition-transform duration-500 group-hover:scale-x-100" />
        <div
          className={`flex items-center justify-center border border-slate-900/10 bg-transparent text-slate-600 transition-colors duration-300 group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700 ${iconContainerSizes[size]}`}
        >
          <Icon
            className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-105`}
          />
        </div>

        <div className="mb-1.5 flex items-start justify-between gap-3">
          <h3 className={`font-semibold text-slate-900 ${titleSizes[size]}`}>{title}</h3>
        </div>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-500">{description}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="border-b border-slate-900/10 px-1 py-0.5 text-[11px] font-medium text-slate-500 transition-colors group-hover:border-blue-200 group-hover:text-blue-700"
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
