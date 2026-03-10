'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { exportToCSV, exportToJSON } from '@/lib/utils/chartUtils';

interface EnhancedChartWrapperProps {
  title: string;
  subtitle?: string;
  data: Record<string, unknown>[];
  children: ReactNode;
  exportFilename?: string;
  enableZoom?: boolean;
}

export function EnhancedChartWrapper({
  title,
  subtitle,
  data,
  children,
  exportFilename = 'chart-data',
  enableZoom = false,
}: EnhancedChartWrapperProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isZoomed, setIsZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCSV = () => {
    exportToCSV(data, exportFilename);
    setShowExportMenu(false);
  };

  const handleExportJSON = () => {
    exportToJSON(data, exportFilename);
    setShowExportMenu(false);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2));
    setIsZoomed(true);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newLevel = Math.max(prev - 0.2, 1);
      if (newLevel === 1) setIsZoomed(false);
      return newLevel;
    });
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setIsZoomed(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          {enableZoom && (
            <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel === 1}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="缩小"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-xs text-gray-600 px-2">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel === 2}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="放大"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              {isZoomed && (
                <button
                  onClick={handleResetZoom}
                  className="p-1 hover:bg-gray-100 rounded"
                  title="重置"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="relative" ref={containerRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="text-gray-600">导出</span>
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                <button
                  onClick={handleExportCSV}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  导出为 CSV
                </button>
                <button
                  onClick={handleExportJSON}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                >
                  导出为 JSON
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top left',
          transition: 'transform 0.3s ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}
