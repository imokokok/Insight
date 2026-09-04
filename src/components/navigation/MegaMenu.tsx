'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';

import { ChevronDown, ArrowRight } from 'lucide-react';

import { type NavGroup } from './types';

interface MegaMenuProps {
  group: NavGroup;
  isActive: boolean;
  currentPath: string;
  onItemClick?: () => void;
}

export function MegaMenu({ group, isActive, currentPath, onItemClick }: MegaMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(true);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 80);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(false);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isGroupActive = group.items.some(
    (item) => currentPath === item.href || currentPath.startsWith(item.href + '/')
  );
  const GroupIcon = group.icon;

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`relative flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors duration-200 ${
          isActive || isGroupActive
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-gray-600 hover:border-slate-300 hover:text-primary-700'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {GroupIcon && <GroupIcon className="w-4 h-4" />}
        <span>{group.label}</span>
        <span
          className={`inline-flex h-[18px] min-w-[18px] items-center justify-center border-l px-1 font-mono text-[10px] font-bold leading-none transition-colors duration-200 ${
            isActive || isGroupActive
              ? 'bg-primary-200 text-primary-700'
              : isOpen || isHovered
                ? 'bg-primary-100 text-primary-600'
                : 'bg-gray-200 text-gray-500'
          }`}
        >
          {group.items.length}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {!isOpen && isHovered && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 flex -translate-x-1/2 items-center gap-1 border border-slate-900/15 bg-[#f8f7f4] px-2.5 py-1.5 animate-fade-in">
          {group.items.slice(0, 5).map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.href}
                className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] text-gray-500"
              >
                {ItemIcon && <ItemIcon className="w-3 h-3" />}
                <span>{item.label}</span>
              </div>
            );
          })}
          {group.items.length > 5 && (
            <span className="text-[10px] text-gray-400 px-1">+{group.items.length - 5}</span>
          )}
        </div>
      )}

      {isOpen && (
        <div
          className="absolute left-1/2 top-full z-50 mt-2 w-[580px] -translate-x-1/2 overflow-hidden border border-slate-900/15 bg-[#f8f7f4] animate-fade-in"
          role="menu"
        >
          <div className="border-b border-slate-900/15 bg-white/55 px-5 py-3.5">
            <div className="flex items-center gap-2">
              {GroupIcon && <GroupIcon className="w-4 h-4 text-primary-600" />}
              <span className="text-sm font-semibold text-gray-900">{group.label}</span>
              <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-gray-400">
                {group.items.length} records
              </span>
            </div>
          </div>

          <div>
            <div className="grid grid-cols-2">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isItemActive =
                  currentPath === item.href || currentPath.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setIsOpen(false);
                      onItemClick?.();
                    }}
                    className={`group relative flex items-start gap-3 border-b border-r border-slate-900/10 px-4 py-4 transition-colors duration-200 ${
                      isItemActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-700 hover:bg-white/70'
                    }`}
                    role="menuitem"
                  >
                    {ItemIcon && (
                      <div className="flex-shrink-0 border border-blue-200 bg-blue-50 p-2 text-blue-700 transition-colors group-hover:bg-white">
                        <ItemIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="inline-flex items-center border-l-2 border-emerald-500 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-700">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {item.description}
                        </div>
                      )}
                    </div>
                    {isItemActive && (
                      <div className="mt-2 h-1.5 w-1.5 flex-shrink-0 bg-primary-600" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-900/15 bg-white/55 px-5 py-3">
            <Link
              href="/docs"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              View all features in documentation
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
