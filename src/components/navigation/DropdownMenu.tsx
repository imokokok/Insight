'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';

import { ChevronDown } from 'lucide-react';

import { type NavGroup } from './types';

interface DropdownMenuProps {
  group: NavGroup;
  isActive: boolean;
  currentPath: string;
  onItemClick?: () => void;
}

export function DropdownMenu({ group, isActive, currentPath, onItemClick }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [_isHovered, setIsHovered] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(true);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(false);
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-600 hover:border-slate-300 hover:text-primary-700'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {GroupIcon && <GroupIcon className="w-4 h-4" />}
        <span>{group.label}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-72 border border-slate-900/15 bg-[#f8f7f4] py-1 animate-fade-in"
          role="menu"
        >
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
                className={`group mx-1 flex items-start gap-3 border-b border-slate-900/10 px-4 py-3 transition-colors duration-200 last:border-b-0 ${
                  isItemActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-white/70'
                }`}
                role="menuitem"
              >
                {ItemIcon && (
                  <div className="border border-blue-200 bg-blue-50 p-2 text-blue-700 transition-colors group-hover:bg-white">
                    <ItemIcon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{item.label}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {item.description}
                    </div>
                  )}
                </div>
                {isItemActive && <div className="mt-2 h-1.5 w-1.5 bg-primary-600" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
