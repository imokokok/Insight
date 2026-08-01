import { useCallback, useState } from 'react';

import type { ImportedPosition } from '@/lib/protocols/importer';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('usePositionImporter');

interface UsePositionImporterReturn {
  isImporting: boolean;
  importError: string | null;
  importedPosition: ImportedPosition | null;
  importPosition: (address: string, protocolId: string) => Promise<ImportedPosition | null>;
  reset: () => void;
}

export function usePositionImporter(): UsePositionImporterReturn {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedPosition, setImportedPosition] = useState<ImportedPosition | null>(null);

  const importPosition = useCallback(async (address: string, protocolId: string) => {
    setIsImporting(true);
    setImportError(null);
    setImportedPosition(null);

    try {
      const response = await fetch('/api/protocol-health/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, protocolId }),
      });

      let json: { success?: boolean; error?: { message?: string }; data?: unknown };
      try {
        json = await response.json();
      } catch {
        throw new Error(`Failed to import position (HTTP ${response.status})`);
      }

      if (!response.ok || !json.success) {
        const message = json.error?.message || 'Failed to import position';
        throw new Error(message);
      }

      const position = json.data as ImportedPosition;
      setImportedPosition(position);
      return position;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Failed to import position: ${message}`);
      setImportError(message);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsImporting(false);
    setImportError(null);
    setImportedPosition(null);
  }, []);

  return { isImporting, importError, importedPosition, importPosition, reset };
}
