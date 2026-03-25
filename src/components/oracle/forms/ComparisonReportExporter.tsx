'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslations } from '@/i18n';
import { createLogger } from '@/lib/utils/logger';
import { DataExportButton } from './DataExportButton';

const logger = createLogger('ComparisonReportExporter');

interface ComparisonReportExporterProps {
  data: {
    symbol: string;
    timestamp: string;
    oracles: Array<{
      provider: string;
      price: number;
      confidence?: number;
      responseTime: number;
      deviation: number;
    }>;
    statistics?: {
      avg: number;
      max: number;
      min: number;
      range: number;
      stdDev: number;
      median: number;
    };
  };
  chartRef?: React.RefObject<HTMLDivElement | null>;
  fileName?: string;
}

export function ComparisonReportExporter({
  data,
  chartRef,
  fileName = 'cross-oracle-comparison-report',
}: ComparisonReportExporterProps) {
  const t = useTranslations();

  const exportColumns = [
    { key: 'provider', label: 'Oracle Provider' },
    { key: 'price', label: 'Price (USD)' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'responseTime', label: 'Response Time (ms)' },
    { key: 'deviation', label: 'Deviation from Average (%)' },
  ];

  const fullFileName = `${fileName}-${data.symbol.toLowerCase()}`;

  return (
    <DataExportButton
      data={data.oracles}
      filename={fullFileName}
      columns={exportColumns}
      compact={true}
    />
  );
}
