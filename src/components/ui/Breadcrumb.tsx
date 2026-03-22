'use client';

import { forwardRef, ReactNode } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: ReactNode;
  showHome?: boolean;
  homeHref?: string;
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  (
    {
      items,
      className,
      separator = <ChevronRight className="w-4 h-4" />,
      showHome = true,
      homeHref = '/',
    },
    ref
  ) => {
    const t = useTranslations('common.breadcrumb');

    return (
      <nav
        ref={ref}
        aria-label="Breadcrumb"
        className={cn('flex items-center', className)}
      >
        <ol className="flex items-center flex-wrap gap-1">
          {showHome && (
            <li className="flex items-center">
              <Link
                href={homeHref}
                className="flex items-center text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">{t('home')}</span>
              </Link>
              {items.length > 0 && (
                <span className="mx-2 text-gray-400">{separator}</span>
              )}
            </li>
          )}
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="flex items-center">
                {isLast ? (
                  <span
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-900"
                    aria-current="page"
                  >
                    {item.icon && <span className="text-gray-400">{item.icon}</span>}
                    <span className="px-2 py-0.5 bg-gray-100 rounded-md">
                      {item.label}
                    </span>
                  </span>
                ) : (
                  <>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      >
                        {item.icon && <span className="text-gray-400">{item.icon}</span>}
                        {item.label}
                      </Link>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-gray-500">
                        {item.icon && <span className="text-gray-400">{item.icon}</span>}
                        {item.label}
                      </span>
                    )}
                    <span className="mx-2 text-gray-400">{separator}</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }
);

Breadcrumb.displayName = 'Breadcrumb';
