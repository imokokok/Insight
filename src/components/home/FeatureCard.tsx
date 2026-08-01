import Link from 'next/link';

import { motion } from 'framer-motion';
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
    large: 'w-10 h-10 rounded-lg mb-4',
    medium: 'w-9 h-9 rounded-lg mb-3',
    small: 'w-9 h-9 rounded-lg mb-3',
  };

  const titleSizes = {
    large: 'text-base lg:text-lg',
    medium: 'text-sm lg:text-base',
    small: 'text-sm lg:text-base',
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      <Link
        href={href}
        className={`group flex flex-col h-full bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 ${sizeStyles[size]}`}
      >
        <div
          className={`flex items-center justify-center bg-slate-50 border border-slate-100 text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50/60 group-hover:border-blue-100 transition-colors duration-300 ${iconContainerSizes[size]}`}
        >
          <Icon
            className={`${iconSizes[size]} transition-transform duration-300 group-hover:scale-105`}
          />
        </div>

        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className={`font-semibold text-slate-900 ${titleSizes[size]}`}>{title}</h3>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mb-3 flex-1">{description}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-[11px] font-medium text-slate-500 group-hover:bg-blue-50/50 group-hover:border-blue-100 group-hover:text-blue-700 transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors mt-auto">
          <span>Explore</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}
