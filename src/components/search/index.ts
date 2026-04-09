'use client';

import React from 'react';

import { ComponentErrorBoundary } from '@/components/error-boundary';

import { GlobalSearch as GlobalSearchComponent } from './GlobalSearch';

export { SearchButton } from './SearchButton';
export { useGlobalSearch } from './useGlobalSearch';
export { useSearchKeyboardNavigation } from './useSearchKeyboardNavigation';
export {
  getOracleSearchResults,
  getBlockchainSearchResults,
  getPairSearchResults,
  getPageSearchResults,
  getFeatureSearchResults,
  getDocumentationSearchResults,
  getAllSearchResults,
  searchGroupLabels,
} from './data';

export type {
  SearchResult,
  SearchResultType,
  SearchGroup,
  UseGlobalSearchOptions,
  UseGlobalSearchReturn,
  KeyboardNavigationState,
  SearchAction,
} from './types';

export type { UseSearchKeyboardNavigationReturn } from './useSearchKeyboardNavigation';
export type { GlobalSearchProps } from './GlobalSearch';

// Export GlobalSearch with Error Boundary
export function GlobalSearch(props: { isOpen: boolean; onClose: () => void }): React.ReactElement {
  return React.createElement(
    ComponentErrorBoundary,
    null,
    React.createElement(GlobalSearchComponent, props)
  );
}

// Also export the raw component for testing
export { GlobalSearchComponent };
