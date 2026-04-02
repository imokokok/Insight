'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';

import { ChevronDown } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { oracleColors } from './config';
import { type NavGroup } from './types';

interface DropdownMenuProps {
  group: NavGroup;
  isActive: boolean;
  currentPath: string;
  onItemClick?: () => void;
}

export function DropdownMenu({ group, isActive, currentPath, onItemClick }: DropdownMenuProps) {
  const t = useTranslations();
  const tUi = useTranslations('ui');
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

  const isGroupActive = group.items.some((item) => item.href === currentPath);
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
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
          isActive || isGroupActive
            ? 'text-primary-600 bg-primary-50'
            : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {GroupIcon && <GroupIcon className="w-4 h-4" />}
        <span>{t(group.label)}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        {(isActive || isGroupActive) && (
          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 " />
        )}
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-100 rounded-lg py-2 z-50 animate-fade-in"
          role="menu"
        >
          {group.items.map((item) => {
            const ItemIcon = item.icon;
            const isItemActive = currentPath === item.href;
            const oracleKey = item.href.replace('/', '') as keyof typeof oracleColors;
            const accentColor = oracleColors[oracleKey];
            const isChronicle = item.href === '/chronicle';

            if (isChronicle) {
              return (
                <div
                  key={item.href}
                  className="relative flex items-start gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group cursor-not-allowed"
                  role="menuitem"
                >
                  {/* 蒙层 */}
                  <div className="absolute inset-0 bg-gray-100/80 rounded-lg z-10" />
                  {/* 即将上线提示 */}
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded">
                      {tUi('common.comingSoon')}
                    </span>
                  </div>
                  {ItemIcon && (
                    <div
                      className={`p-2 rounded-md transition-colors bg-gray-100`}
                    >
                      <ItemIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-400">{t(item.label)}</div>
                    {item.description && (
                      <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                        {t(item.description)}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setIsOpen(false);
                  onItemClick?.();
                }}
                className={`flex items-start gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                  isItemActive ? 'bg-primary-50 text-primary-600' : 'hover:bg-gray-50 text-gray-700'
                }`}
                role="menuitem"
              >
                {ItemIcon && (
                  <div
                    className={`p-2 rounded-md transition-colors ${
                      isItemActive ? 'bg-primary-100' : 'bg-gray-100 group-hover:bg-white'
                    }`}
                    style={
                      accentColor && !isItemActive ? { backgroundColor: `${accentColor}15` } : {}
                    }
                  >
                    <ItemIcon
                      className="w-4 h-4"
                      style={accentColor && !isItemActive ? { color: accentColor } : {}}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{t(item.label)}</div>
                  {item.description && (
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {t(item.description)}
                    </div>
                  )}
                </div>
                {isItemActive && <div className="w-1.5 h-1.5 bg-primary-600  mt-2" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
