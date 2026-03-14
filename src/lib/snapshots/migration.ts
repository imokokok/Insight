import { OracleSnapshot } from '@/types/oracle';
import { saveSnapshotToDatabase } from './database';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('snapshot-migration');

const STORAGE_KEY = 'oracle-snapshots';
const MIGRATION_FLAG_KEY = 'oracle-snapshots-migrated';

export interface MigrationResult {
  success: boolean;
  migratedCount: number;
  failedCount: number;
  errors: string[];
}

export function detectLocalStorageSnapshots(): OracleSnapshot[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const snapshots = JSON.parse(data) as OracleSnapshot[];
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error(
      'Failed to detect localStorage snapshots',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export function hasMigratedBefore(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem(MIGRATION_FLAG_KEY) === 'true';
}

export function markMigrationComplete(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
}

export async function migrateSnapshotsToDatabase(
  userId: string,
  snapshots: OracleSnapshot[]
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (const snapshot of snapshots) {
    try {
      const saved = await saveSnapshotToDatabase(userId, {
        symbol: snapshot.symbol,
        selectedOracles: snapshot.selectedOracles,
        priceData: snapshot.priceData,
        stats: snapshot.stats,
      });

      if (saved) {
        result.migratedCount++;
      } else {
        result.failedCount++;
        result.errors.push(`Failed to migrate snapshot: ${snapshot.id}`);
      }
    } catch (error) {
      result.failedCount++;
      result.errors.push(
        `Error migrating snapshot ${snapshot.id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  result.success = result.failedCount === 0;

  if (result.success && result.migratedCount > 0) {
    markMigrationComplete();
  }

  return result;
}

export function clearLocalStorageSnapshots(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    logger.error(
      'Failed to clear localStorage snapshots',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export function shouldShowMigrationPrompt(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const hasSnapshots = detectLocalStorageSnapshots().length > 0;
  const hasMigrated = hasMigratedBefore();

  return hasSnapshots && !hasMigrated;
}

export interface MigrationPromptState {
  show: boolean;
  snapshotCount: number;
  onMigrate: () => Promise<void>;
  onDismiss: () => void;
  onRemindLater: () => void;
}

export function createMigrationPromptState(
  onMigrate: () => Promise<void>,
  onDismiss: () => void,
  onRemindLater: () => void
): MigrationPromptState {
  const snapshots = detectLocalStorageSnapshots();

  return {
    show: snapshots.length > 0 && !hasMigratedBefore(),
    snapshotCount: snapshots.length,
    onMigrate,
    onDismiss,
    onRemindLater,
  };
}
