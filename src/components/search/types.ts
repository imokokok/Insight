import { LucideIcon } from 'lucide-react';

export type SearchResultType =
  | 'oracle'
  | 'pair'
  | 'blockchain'
  | 'page'
  | 'feature'
  | 'documentation';

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: SearchResultType;
  href: string;
  icon?: LucideIcon;
  iconUrl?: string;
  keywords?: string[];
  priority?: number;
}

export interface SearchGroup {
  type: SearchResultType;
  label: string;
  results: SearchResult[];
}

export interface UseGlobalSearchOptions {
  maxResults?: number;
  threshold?: number;
  includeOracles?: boolean;
  includePairs?: boolean;
  includeBlockchains?: boolean;
  includePages?: boolean;
  includeFeatures?: boolean;
  includeDocumentation?: boolean;
}

export interface UseGlobalSearchReturn {
  results: SearchGroup[];
  isSearching: boolean;
  error: Error | null;
  search: (query: string) => void;
  clearSearch: () => void;
  retry: () => void;
}

export interface KeyboardNavigationState {
  activeGroupIndex: number;
  activeItemIndex: number;
}

export type SearchAction =
  | { type: 'MOVE_DOWN' }
  | { type: 'MOVE_UP' }
  | { type: 'MOVE_NEXT_GROUP' }
  | { type: 'MOVE_PREV_GROUP' }
  | { type: 'RESET' }
  | { type: 'SET_POSITION'; groupIndex: number; itemIndex: number };
