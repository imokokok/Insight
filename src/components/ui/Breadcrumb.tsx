'use client';

import { forwardRef, ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';
import { baseColors } from '@/lib/config/colors';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: 'slash' | 'chevron' | ReactNode;
  showHome?: boolean;
  homeHref?: string;
}

export const Breadcrumb = forwardRef<HTMLElement, BreadcrumbProps>(
  ({ items, className, separator = 'chevron', showHome = true, homeHref = '/' }, ref) => {
    const renderSeparator = () => {
      if (separator === 'slash') {
        return (
          <span className="text-sm mx-1" style={{ color: baseColors.gray[400] }}>
            /
          </span>
        );
      }
      if (separator === 'chevron') {
        return (
          <ChevronRight className="w-3.5 h-3.5 mx-1" style={{ color: baseColors.gray[400] }} />
        );
      }
      return (
        <span className="mx-1" style={{ color: baseColors.gray[400] }}>
          {separator}
        </span>
      );
    };

    return (
      <nav ref={ref} aria-label="Breadcrumb" className={cn('flex items-center', className)}>
        <ol className="flex items-center flex-wrap">
          {showHome && (
            <li className="flex items-center">
              <Link
                href={homeHref}
                className="flex items-center gap-1.5 text-sm rounded-md px-2 py-1 transition-colors duration-200"
                style={{
                  color: baseColors.gray[500],
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = baseColors.gray[700];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = baseColors.gray[500];
                }}
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">Home</span>
              </Link>
              {items.length > 0 && renderSeparator()}
            </li>
          )}
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li key={index} className="flex items-center">
                {isLast ? (
                  <span
                    className="flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-md"
                    style={{ color: baseColors.gray[500] }}
                    aria-current="page"
                  >
                    {item.icon && <span style={{ color: baseColors.gray[400] }}>{item.icon}</span>}
                    {item.label}
                  </span>
                ) : (
                  <>
                    {item.href ? (
                      <Link
                        href={item.href}
                        className="flex items-center gap-1.5 text-sm rounded-md px-2 py-1 transition-colors duration-200"
                        style={{
                          color: baseColors.gray[500],
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = baseColors.gray[700];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = baseColors.gray[500];
                        }}
                      >
                        {item.icon && (
                          <span style={{ color: baseColors.gray[400] }}>{item.icon}</span>
                        )}
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className="flex items-center gap-1.5 text-sm px-2 py-1"
                        style={{ color: baseColors.gray[500] }}
                      >
                        {item.icon && (
                          <span style={{ color: baseColors.gray[400] }}>{item.icon}</span>
                        )}
                        {item.label}
                      </span>
                    )}
                    {renderSeparator()}
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
