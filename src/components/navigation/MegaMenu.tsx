'use client';

import { useState, useRef, useEffect } from 'react';

import Link from 'next/link';

import { ChevronDown, ArrowRight } from 'lucide-react';

import { oracleColors } from './config';
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
        className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
          isActive || isGroupActive
            ? 'text-primary-600 bg-primary-50'
            : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {GroupIcon && <GroupIcon className="w-4 h-4" />}
        <span>{group.label}</span>
        <span
          className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-none transition-colors duration-200 ${
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
        {(isActive || isGroupActive) && (
          <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-600 rounded-full" />
        )}
      </button>

      {!isOpen && isHovered && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1.5 flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-100 rounded-lg shadow-md z-50 animate-fade-in">
          {group.items.slice(0, 5).map((item) => {
            const ItemIcon = item.icon;
            return (
              <div
                key={item.href}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-gray-500"
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
          className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-[540px] bg-white border border-gray-100 rounded-xl shadow-xl z-50 animate-fade-in overflow-hidden"
          role="menu"
        >
          <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2">
              {GroupIcon && <GroupIcon className="w-4 h-4 text-primary-600" />}
              <span className="text-sm font-semibold text-gray-900">{group.label}</span>
              <span className="text-xs text-gray-400 ml-1">{group.items.length} features</span>
            </div>
          </div>

          <div className="p-3">
            <div className="grid grid-cols-2 gap-1">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                const isItemActive =
                  currentPath === item.href || currentPath.startsWith(item.href + '/');
                const oracleKey = item.href.replace('/', '') as keyof typeof oracleColors;
                const accentColor = oracleColors[oracleKey];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setIsOpen(false);
                      onItemClick?.();
                    }}
                    className={`flex items-start gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                      isItemActive
                        ? 'bg-primary-50 text-primary-600'
                        : item.highlight
                          ? 'bg-blue-50/50 hover:bg-blue-50 text-gray-700'
                          : 'hover:bg-gray-50 text-gray-700'
                    }`}
                    role="menuitem"
                  >
                    {ItemIcon && (
                      <div
                        className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                          isItemActive
                            ? 'bg-primary-100'
                            : item.highlight
                              ? 'bg-blue-100'
                              : 'bg-gray-100 group-hover:bg-white'
                        }`}
                        style={
                          accentColor && !isItemActive && !item.highlight
                            ? { backgroundColor: `${accentColor}15` }
                            : {}
                        }
                      >
                        <ItemIcon
                          className="w-4 h-4"
                          style={
                            accentColor && !isItemActive && !item.highlight
                              ? { color: accentColor }
                              : {}
                          }
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{item.label}</span>
                        {item.badge && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700 leading-none">
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
                      <div className="w-1.5 h-1.5 bg-primary-600 rounded-full mt-2 flex-shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
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
