export {
  saveSnapshotToDatabase,
  getSnapshotsFromDatabase,
  getSnapshotById,
  getPublicSnapshot,
  updateSnapshot,
  deleteSnapshotFromDatabase,
  shareSnapshot,
  unshareSnapshot,
  getSnapshotShareStatus,
  type DatabaseSnapshot,
} from './database';

export {
  detectLocalStorageSnapshots,
  migrateSnapshotsToDatabase,
  clearLocalStorageSnapshots,
  hasMigratedBefore,
  markMigrationComplete,
  shouldShowMigrationPrompt,
  createMigrationPromptState,
  type MigrationResult,
  type MigrationPromptState,
} from './migration';

export {
  compareSnapshots,
  type OracleSnapshot,
  type SnapshotStats,
  type SnapshotComparisonResult,
} from '@/types/oracle';
export { formatTimestamp, getTimeAgo } from '@/types/common';

export {
  saveSnapshot as saveSnapshotToLocalStorage,
  getSnapshots as getSnapshotsFromLocalStorage,
  deleteSnapshot as deleteSnapshotFromLocalStorage,
  clearAllSnapshots as clearAllLocalStorageSnapshots,
  getSnapshotById as getSnapshotByIdFromLocalStorage,
} from '@/types/oracle';
