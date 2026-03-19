'use client';

import { FloatingActionButton } from '@/components/oracle/common/FloatingActionButton';

interface ExportSectionProps {
  handleExportCSV: () => void;
  handleExportJSON: () => void;
  handleSaveSnapshot: () => void;
  isLoading: boolean;
}

export function ExportSection({
  handleExportCSV,
  handleExportJSON,
  handleSaveSnapshot,
  isLoading,
}: ExportSectionProps) {
  return (
    <FloatingActionButton
      onExportCSV={handleExportCSV}
      onExportJSON={handleExportJSON}
      onExportExcel={handleExportCSV}
      onSaveSnapshot={handleSaveSnapshot}
      isLoading={isLoading}
    />
  );
}
