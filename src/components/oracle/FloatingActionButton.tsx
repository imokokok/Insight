'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface FloatingActionButtonProps {
  onRefresh: () => void;
  onExportCSV: () => void;
  onExportJSON: () => void;
  onExportExcel?: () => void;
  isLoading?: boolean;
}

export function FloatingActionButton({
  onRefresh,
  onExportCSV,
  onExportJSON,
  onExportExcel,
  isLoading = false,
}: FloatingActionButtonProps) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }, []);

  const handleExportClick = useCallback((format: 'csv' | 'json' | 'excel') => {
    setShowExportMenu(false);
    if (format === 'csv') {
      onExportCSV();
    } else if (format === 'json') {
      onExportJSON();
    } else if (format === 'excel' && onExportExcel) {
      onExportExcel();
    }
  }, [onExportCSV, onExportJSON, onExportExcel]);

  return (
    <div className="fixed bottom-20 right-5 z-50 flex flex-col gap-3">
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all duration-200 flex items-center justify-center group"
          title="返回顶部"
        >
          <svg
            className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      <div className="relative" ref={exportMenuRef}>
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          disabled={isLoading}
          className={`w-12 h-12 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${
            isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
          }`}
          title="导出数据"
        >
          <svg
            className="w-5 h-5 text-gray-600 group-hover:text-gray-900 transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
        </button>

        {showExportMenu && (
          <div className="absolute bottom-full right-0 mb-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="py-1">
              <button
                onClick={() => handleExportClick('csv')}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSV 格式
              </button>
              <button
                onClick={() => handleExportClick('json')}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M15 12h.01M12 12h.01" />
                </svg>
                JSON 格式
              </button>
              <button
                onClick={() => handleExportClick('excel')}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                Excel 格式
              </button>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={onRefresh}
        disabled={isLoading}
        className={`w-12 h-12 bg-blue-600 border border-blue-700 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center group ${
          isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
        }`}
        title="刷新数据"
      >
        <svg
          className={`w-5 h-5 text-white transition-all ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
