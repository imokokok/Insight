'use client';

import React from 'react';

import { ComponentErrorBoundary } from '@/components/error-boundary';

import { GlobalSearch as GlobalSearchComponent } from './GlobalSearch';

export { SearchButton } from './SearchButton';
// Export GlobalSearch with Error Boundary
export function GlobalSearch(props: { isOpen: boolean; onClose: () => void }): React.ReactElement {
  return React.createElement(
    ComponentErrorBoundary,
    null,
    React.createElement(GlobalSearchComponent, props)
  );
}

// Also export the raw component for testing
