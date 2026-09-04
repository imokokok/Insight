'use client';

import { ApiReferenceReact } from '@scalar/api-reference-react';

import '@scalar/api-reference-react/style.css';

const SCALAR_CUSTOM_CSS = `
  :root {
    --scalar-font: var(--font-geist-sans), 'Inter', system-ui, -apple-system, sans-serif;
    --scalar-font-code: var(--font-geist-mono), 'JetBrains Mono', ui-monospace, monospace;
  }

  .scalar-app {
    --scalar-color-1: #111827;
    --scalar-color-2: #374151;
    --scalar-color-3: #6b7280;
    --scalar-color-accent: #2563eb;
    --scalar-color-green: #059669;
    --scalar-color-red: #dc2626;
    --scalar-color-yellow: #d97706;
    --scalar-color-blue: #2563eb;
    --scalar-background-1: #ffffff;
    --scalar-background-2: #f9fafb;
    --scalar-background-3: #f3f4f6;
    --scalar-background-accent: #eff6ff;
    --scalar-border-color: #e5e7eb;
  }

  /* Hide Scalar's own chrome — the page provides a custom sticky header */
  .scalar-app .scalar-app-header,
  .scalar-app .scalar-api-reference-toolbar,
  .scalar-app .scalar-api-reference-header,
  .scalar-app .t-doc__header {
    display: none !important;
  }

  /* The reference is allowed to scroll naturally with the page. */
  /* We only ensure it does not overflow its container horizontally. */
  .scalar-app,
  .scalar-api-reference,
  .references-layout {
    min-height: 100%;
  }

  /* Sidebar: narrower, clean, sticky within the reference */
  .scalar-app .scalar-sidebar {
    background-color: #fafafa;
    border-right: 1px solid #e5e7eb;
    width: 260px;
    min-width: 260px;
  }

  .scalar-app .scalar-sidebar-items {
    padding: 0.75rem;
  }

  .scalar-app .scalar-sidebar-item {
    border-radius: 0;
    color: #374151;
    font-size: 0.8125rem;
    padding: 0.375rem 0.625rem;
  }

  .scalar-app .scalar-sidebar-item:hover {
    background-color: #f3f4f6;
    color: #111827;
  }

  .scalar-app .scalar-sidebar-item.active {
    background-color: #eff6ff;
    color: #2563eb;
    font-weight: 600;
  }

  /* Sidebar section headings */
  .scalar-app .scalar-sidebar-group-title {
    color: #6b7280;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.75rem 0.625rem 0.375rem;
  }

  /* Search input */
  .scalar-app .scalar-search-input {
    background-color: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.125rem;
    font-size: 0.8125rem;
  }

  .scalar-app .scalar-search-input:focus {
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  /* Main content area */
  .scalar-app .scalar-api-reference__content {
    background-color: #ffffff;
  }

  .scalar-app .scalar-api-reference__content > .scalar-section:first-child {
    padding-top: 2rem;
  }

  /* Section headings */
  .scalar-app .scalar-section-header h2,
  .scalar-app .scalar-heading-2 {
    color: #111827;
    font-weight: 700;
  }

  /* Operation cards */
  .scalar-app .scalar-card,
  .scalar-app .scalar-api-reference__operation {
    border-color: #e5e7eb;
    border-radius: 0.125rem;
    background-color: #ffffff;
  }

  .scalar-app .scalar-card:hover,
  .scalar-app .scalar-api-reference__operation:hover {
    border-color: #bfdbfe;
  }

  /* HTTP method badges */
  .scalar-app .scalar-method {
    font-weight: 600;
    font-size: 0.6875rem;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    text-transform: uppercase;
  }

  .scalar-app .scalar-method--get {
    color: #2563eb;
    background-color: #eff6ff;
  }

  .scalar-app .scalar-method--post {
    color: #059669;
    background-color: #ecfdf5;
  }

  .scalar-app .scalar-method--delete {
    color: #dc2626;
    background-color: #fef2f2;
  }

  .scalar-app .scalar-method--patch {
    color: #d97706;
    background-color: #fffbeb;
  }

  .scalar-app .scalar-method--put {
    color: #1d4ed8;
    background-color: #eff6ff;
  }

  /* Code blocks & client examples */
  .scalar-app pre,
  .scalar-app code {
    font-family: var(--scalar-font-code);
  }

  .scalar-app pre {
    background-color: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 0.125rem;
  }

  /* Tabs for client languages */
  .scalar-app .scalar-client-libraries__tab,
  .scalar-app .scalar-tab {
    color: #6b7280;
    font-size: 0.8125rem;
    border-bottom: 2px solid transparent;
  }

  .scalar-app .scalar-client-libraries__tab.active,
  .scalar-app .scalar-tab.active {
    color: #2563eb;
    border-bottom-color: #2563eb;
    font-weight: 500;
  }

  /* Buttons inside Scalar */
  .scalar-app .scalar-button,
  .scalar-app button.scalar-button {
    border-radius: 0.125rem;
    font-weight: 500;
  }

  .scalar-app .scalar-button-primary {
    background-color: #2563eb;
    color: #ffffff;
  }

  .scalar-app .scalar-button-primary:hover {
    background-color: #1d4ed8;
  }

  /* Tables (auth, pricing, etc.) */
  .scalar-app table {
    border-color: #e5e7eb;
    border-radius: 0;
    overflow: hidden;
  }

  .scalar-app th {
    background-color: #f9fafb;
    color: #374151;
    font-weight: 600;
    font-size: 0.8125rem;
  }

  .scalar-app td {
    color: #4b5563;
    font-size: 0.8125rem;
  }

  /* Mobile: let sidebar collapse naturally */
  @media (max-width: 768px) {
    .scalar-app .scalar-sidebar {
      width: 100%;
      min-width: 100%;
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
    }
  }
`;

export function ApiReferenceContainer() {
  return (
    <div className="min-h-[70vh] bg-white">
      <ApiReferenceReact
        configuration={{
          url: '/openapi.yaml',
          theme: 'default',
          layout: 'classic',
          hideModels: false,
          hideDownloadButton: true,
          hideSearch: false,
          hideTestRequestButton: false,
          hideDarkModeToggle: true,
          forceDarkModeState: 'light',
          showDeveloperTools: 'never',
          searchHotKey: 'k',
          defaultOpenFirstTag: true,
          _integration: 'nextjs',
          customCss: SCALAR_CUSTOM_CSS,
        }}
      />
    </div>
  );
}
