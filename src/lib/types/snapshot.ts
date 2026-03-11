import { OracleProvider, PriceData } from './oracle';

export interface SnapshotStats {
  avgPrice: number;
  weightedAvgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

export interface OracleSnapshot {
  id: string;
  timestamp: number;
  symbol: string;
  selectedOracles: OracleProvider[];
  priceData: PriceData[];
  stats: SnapshotStats;
}

export interface SnapshotComparisonResult {
  snapshotId: string;
  snapshotTimestamp: number;
  priceChange: {
    avgPrice: number;
    avgPricePercent: number;
    maxPrice: number;
    maxPricePercent: number;
    minPrice: number;
    minPricePercent: number;
  };
  oracleCountChange: number;
  statsChange: {
    priceRange: number;
    priceRangePercent: number;
    standardDeviationPercent: number;
    standardDeviationPercentChange: number;
    variance: number;
    variancePercent: number;
  };
}

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
    console.error('Failed to save snapshot to localStorage:', error);
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
    console.error('Failed to read snapshots from localStorage:', error);
    return [];
  }
}

export function getSnapshotById(id: string): OracleSnapshot | null {
  const snapshots = getSnapshots();
  return snapshots.find(s => s.id === id) || null;
}

export function deleteSnapshot(id: string): boolean {
  const snapshots = getSnapshots();
  const index = snapshots.findIndex(s => s.id === id);
  
  if (index === -1) return false;
  
  snapshots.splice(index, 1);
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    return true;
  } catch (error) {
    console.error('Failed to delete snapshot from localStorage:', error);
    return false;
  }
}

export function clearAllSnapshots(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Failed to clear snapshots from localStorage:', error);
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
      standardDeviationPercent: currentStats.standardDeviationPercent - snapshot.stats.standardDeviationPercent,
      standardDeviationPercentChange: calculateChangePercent(
        currentStats.standardDeviationPercent,
        snapshot.stats.standardDeviationPercent
      ),
      variance: calculateChange(currentStats.variance, snapshot.stats.variance),
      variancePercent: calculateChangePercent(currentStats.variance, snapshot.stats.variance),
    },
  };
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (days > 0) return `${days}天前`;
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}
