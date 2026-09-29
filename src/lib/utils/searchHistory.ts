export interface SearchHistoryItem {
  symbol: string;
  timestamp: number;
}

const STORAGE_KEY = 'oracle_insight_search_history';
const MAX_HISTORY_ITEMS = 10;

function isSearchHistoryItem(value: unknown): value is SearchHistoryItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.symbol === 'string' &&
    item.symbol.trim().length > 0 &&
    typeof item.timestamp === 'number' &&
    Number.isSafeInteger(item.timestamp) &&
    item.timestamp >= 0
  );
}

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isSearchHistoryItem)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, MAX_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function saveSearchHistory(symbol: string): void {
  if (typeof window === 'undefined' || !symbol.trim()) return;

  try {
    const history = getSearchHistory();
    const normalizedSymbol = symbol.trim().toUpperCase();

    const filtered = history.filter((item) => item.symbol !== normalizedSymbol);

    const newItem: SearchHistoryItem = {
      symbol: normalizedSymbol,
      timestamp: Date.now(),
    };

    const updated = [newItem, ...filtered].slice(0, MAX_HISTORY_ITEMS);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

export function clearSearchHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function removeFromSearchHistory(symbol: string): void {
  if (typeof window === 'undefined' || !symbol.trim()) return;

  try {
    const history = getSearchHistory();
    const normalizedSymbol = symbol.trim().toUpperCase();
    const filtered = history.filter((item) => item.symbol !== normalizedSymbol);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore storage errors
  }
}
