import { createLogger } from '@/lib/utils/logger';
import { OracleSnapshot, SnapshotStats, SnapshotComparisonResult } from './snapshot';
import { PriceData } from './price';

const logger = createLogger('snapshot-types');

const STORAGE_KEY = 'oracle-snapshots';
const MAX_SNAPSHOTS = 10;

export function generateSnapshotId(): string {
  return `snapshot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function saveSnapshot(snapshot: Omit<OracleSnapshot, 'id'>): OracleSnapshot {
  const snapshots = getSnapshots();

  const newSnapshot: OracleSnapshot = {
    ...snapshot,
    id: generateSnapshotId(),
  };

  snapshots.unshift(newSnapshot);

  if (snapshots.length > MAX_SNAPSHOTS) {
    snapshots.splice(MAX_SNAPSHOTS);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch (error) {
    logger.error(
      'Failed to save snapshot to localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
  }

  return newSnapshot;
}

export function getSnapshots(): OracleSnapshot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];

    const snapshots = JSON.parse(data) as OracleSnapshot[];
    return snapshots.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    logger.error(
      'Failed to read snapshots from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export function getSnapshotById(id: string): OracleSnapshot | null {
  const snapshots = getSnapshots();
  return snapshots.find((s) => s.id === id) || null;
}

export function deleteSnapshot(id: string): boolean {
  const snapshots = getSnapshots();
  const index = snapshots.findIndex((s) => s.id === id);

  if (index === -1) return false;

  snapshots.splice(index, 1);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    return true;
  } catch (error) {
    logger.error(
      'Failed to delete snapshot from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export function clearAllSnapshots(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    logger.error(
      'Failed to clear snapshots from localStorage',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

export function compareSnapshots(
  currentStats: SnapshotStats,
  currentPriceData: PriceData[],
  currentSymbol: string,
  snapshot: OracleSnapshot
): SnapshotComparisonResult {
  const calculateChange = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return current - previous;
  };

  const calculateChangePercent = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    snapshotId: snapshot.id,
    snapshotTimestamp: snapshot.timestamp,
    priceChange: {
      avgPrice: calculateChange(currentStats.avgPrice, snapshot.stats.avgPrice),
      avgPricePercent: calculateChangePercent(currentStats.avgPrice, snapshot.stats.avgPrice),
      maxPrice: calculateChange(currentStats.maxPrice, snapshot.stats.maxPrice),
      maxPricePercent: calculateChangePercent(currentStats.maxPrice, snapshot.stats.maxPrice),
      minPrice: calculateChange(currentStats.minPrice, snapshot.stats.minPrice),
      minPricePercent: calculateChangePercent(currentStats.minPrice, snapshot.stats.minPrice),
    },
    oracleCountChange: currentPriceData.length - snapshot.priceData.length,
    statsChange: {
      priceRange: calculateChange(currentStats.priceRange, snapshot.stats.priceRange),
      priceRangePercent: calculateChangePercent(currentStats.priceRange, snapshot.stats.priceRange),
      standardDeviationPercent:
        currentStats.standardDeviationPercent - snapshot.stats.standardDeviationPercent,
      standardDeviationPercentChange: calculateChangePercent(
        currentStats.standardDeviationPercent,
        snapshot.stats.standardDeviationPercent
      ),
      variance: calculateChange(currentStats.variance, snapshot.stats.variance),
      variancePercent: calculateChangePercent(currentStats.variance, snapshot.stats.variance),
    },
  };
}
