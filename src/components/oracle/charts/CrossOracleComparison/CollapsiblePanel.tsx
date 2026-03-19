'use client';

import { useState, useEffect } from 'react';

interface CollapsiblePanelProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  storageKey?: string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function CollapsiblePanel({
  title,
  children,
  defaultExpanded = true,
  storageKey,
  className = '',
  headerClassName = '',
  contentClassName = '',
}: CollapsiblePanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMounted, setIsMounted] = useState(false);

  // Load saved state from localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    if (storageKey) {
      const savedState = localStorage.getItem(`collapsible-${storageKey}`);
      if (savedState !== null) {
        setIsExpanded(savedState === 'true');
      }
    }
  }, [storageKey]);

  const toggleExpanded = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (storageKey) {
      localStorage.setItem(`collapsible-${storageKey}`, String(newState));
    }
  };

  if (!isMounted) {
    return (
      <div className={`border-b border-gray-200/60 ${className}`}>
        <div className={`py-3 flex items-center justify-between ${headerClassName}`}>
          <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        </div>
        <div className={`${contentClassName}`}>{children}</div>
      </div>
    );
  }

  return (
    <div className={`border-b border-gray-200/60 ${className}`}>
      <button
        onClick={toggleExpanded}
        className={`w-full py-3 flex items-center justify-between hover:text-gray-900 transition-colors ${headerClassName}`}
      >
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isExpanded ? 'max-h-[2000px] opacity-100 pb-4' : 'max-h-0 opacity-0'
        }`}
      >
        <div className={`${contentClassName}`}>{children}</div>
      </div>
    </div>
  );
}
