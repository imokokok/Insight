export interface SearchHistoryItem {
  symbol: string;
  timestamp: number;
}

const STORAGE_KEY = 'oracle_insight_search_history';
const MAX_HISTORY_ITEMS = 10;

export function getSearchHistory(): SearchHistoryItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as SearchHistoryItem[];
    return parsed
      .filter((item) => item && typeof item.symbol === 'string')
      .sort((a, b) => b.timestamp - a.timestamp);
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
