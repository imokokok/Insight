import { type OracleProvider, type Blockchain } from '@/types/oracle';

export interface QueryHistoryItem {
  id: string;
  timestamp: number;
  oracles: OracleProvider[];
  chains: Blockchain[];
  symbol: string;
  timeRange: number;
}

const STORAGE_KEY = 'price-query-history';
const MAX_HISTORY_ITEMS = 10;

export function saveQueryHistory(item: Omit<QueryHistoryItem, 'id' | 'timestamp'>): void {
  if (typeof window === 'undefined') return;

  const history = getQueryHistory();
  const newItem: QueryHistoryItem = {
    ...item,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  const existingIndex = history.findIndex(
    (h) =>
      JSON.stringify(h.oracles.sort()) === JSON.stringify(item.oracles.sort()) &&
      JSON.stringify(h.chains.sort()) === JSON.stringify(item.chains.sort()) &&
      h.symbol === item.symbol &&
      h.timeRange === item.timeRange
  );

  if (existingIndex >= 0) {
    history.splice(existingIndex, 1);
  }

  history.unshift(newItem);

  const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
}

export function getQueryHistory(): QueryHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function clearQueryHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString();
}
