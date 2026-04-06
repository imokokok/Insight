'use client';

import { useState, useRef, useEffect, type RefObject } from 'react';

import {
  type ExportOptions,
  type ExportProgress,
  type ChartExportData,
  type ExportSettings,
  type Resolution,
} from '@/lib/utils/chartExport';

export interface ExportState {
  isOpen: boolean;
  showSettings: boolean;
  showResolutionPicker: boolean;
  showBatchSelector: boolean;
  showPreview: boolean;
  selectedResolution: Resolution;
  pendingFormat: ExportOptions['format'] | null;
  progress: ExportProgress;
  settings: ExportSettings;
  selectedCharts: Set<string>;
}

export interface UseExportStateProps {
  filename?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface UseExportStateReturn {
  state: ExportState;
  dropdownRef: RefObject<HTMLDivElement | null>;
  defaultDateRange: {
    start: Date;
    end: Date;
  };
  setIsOpen: (value: boolean) => void;
  setShowSettings: (value: boolean) => void;
  setShowResolutionPicker: (value: boolean) => void;
  setShowBatchSelector: (value: boolean) => void;
  setShowPreview: (value: boolean) => void;
  setSelectedResolution: (value: Resolution) => void;
  setPendingFormat: (value: ExportOptions['format'] | null) => void;
  setProgress: (value: ExportProgress) => void;
  setSettings: (value: ExportSettings) => void;
  setSelectedCharts: (value: Set<string>) => void;
  closeAllPanels: () => void;
}

export function useExportState({
  filename = 'chart-export',
  dateRange,
}: UseExportStateProps = {}): UseExportStateReturn {
  const [defaultDateRange] = useState(() => ({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResolutionPicker, setShowResolutionPicker] = useState(false);
  const [showBatchSelector, setShowBatchSelector] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<Resolution>('standard');
  const [pendingFormat, setPendingFormat] = useState<ExportOptions['format'] | null>(null);
  const [progress, setProgress] = useState<ExportProgress>({
    status: 'idle',
    progress: 0,
    messageKey: '',
  });

  const [settings, setSettings] = useState<ExportSettings>({
    range: 'current',
    includeMetadata: true,
    includeWatermark: true,
    filenameTemplate: '{title}_{date}_{time}',
    customFilename: filename,
    dateRange: dateRange || defaultDateRange,
  });

  const [selectedCharts, setSelectedCharts] = useState<Set<string>>(new Set());

  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeAllPanels = () => {
    setIsOpen(false);
    setShowSettings(false);
    setShowBatchSelector(false);
    setShowPreview(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeAllPanels();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return {
    state: {
      isOpen,
      showSettings,
      showResolutionPicker,
      showBatchSelector,
      showPreview,
      selectedResolution,
      pendingFormat,
      progress,
      settings,
      selectedCharts,
    },
    dropdownRef,
    defaultDateRange,
    setIsOpen,
    setShowSettings,
    setShowResolutionPicker,
    setShowBatchSelector,
    setShowPreview,
    setSelectedResolution,
    setPendingFormat,
    setProgress,
    setSettings,
    setSelectedCharts,
    closeAllPanels,
  };
}
