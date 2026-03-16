'use client';

import { useState, ReactNode } from 'react';
import { baseColors, semanticColors } from '@/lib/config/colors';

interface CollapsibleSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  storageKey?: string;
}

export function CollapsibleSection({
  title,
  description,
  children,
  defaultExpanded = false,
  storageKey,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (storageKey && typeof window !== 'undefined') {
      const saved = localStorage.getItem(`crossChain_${storageKey}`);
      return saved ? saved === 'true' : defaultExpanded;
    }
    return defaultExpanded;
  });

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`crossChain_${storageKey}`, String(newState));
    }
  };

  return (
    <div className="mb-6 border" style={{ borderColor: baseColors.gray[200] }}>
      <button
        onClick={toggleExpanded}
        className="w-full px-4 py-3 flex items-center justify-between transition-colors hover:bg-gray-50"
        style={{ backgroundColor: isExpanded ? baseColors.gray[50] : 'white' }}
      >
        <div className="text-left">
          <h3
            className="text-sm font-medium"
            style={{ color: baseColors.gray[900] }}
          >
            {title}
          </h3>
          {description && (
            <p className="text-xs mt-0.5" style={{ color: baseColors.gray[500] }}>
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs"
            style={{ color: baseColors.gray[400] }}
          >
            {isExpanded ? '收起' : '展开'}
          </span>
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{ color: baseColors.gray[400] }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>
      {isExpanded && (
        <div className="border-t" style={{ borderColor: baseColors.gray[200] }}>
          {children}
        </div>
      )}
    </div>
  );
}
