'use client';

import Link from 'next/link';

import { ArrowLeft, Download, ExternalLink, FileJson, Terminal } from 'lucide-react';

interface HeaderButtonProps {
  href: string;
  variant?: 'primary' | 'secondary';
  download?: string;
  external?: boolean;
  leftIcon?: React.ReactNode;
  children: React.ReactNode;
}

function HeaderButton({
  href,
  variant = 'secondary',
  download,
  external,
  leftIcon,
  children,
}: HeaderButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center gap-1.5 border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  const variants = {
    primary: 'border-blue-700 bg-blue-700 text-white hover:bg-slate-950',
    secondary: 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700',
  };
  const linkProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {};

  return (
    <a
      href={href}
      download={download}
      className={`${baseStyles} ${variants[variant]}`}
      {...linkProps}
    >
      {leftIcon}
      {children}
      {external && <ExternalLink className="w-3 h-3" />}
    </a>
  );
}

export function ApiDocsHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-900/15 bg-[#f8f7f4]/95 backdrop-blur">
      <div className="mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: title & meta */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center border border-blue-200 bg-blue-50 text-blue-700 sm:flex">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Docs
                </Link>
                <span className="text-slate-300">/</span>
                <span className="text-xs text-slate-500">API Reference</span>
              </div>
              <div className="flex items-baseline gap-3">
                <h1 className="truncate text-lg font-bold text-slate-950 sm:text-xl">
                  Insight Oracle API
                </h1>
                <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-700 md:inline">
                  Reference 01
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                OpenAPI 3.1 · 40 endpoints ·{' '}
                <code className="text-blue-600 bg-blue-50 px-1 py-0.5 rounded">
                  oracleinsight.xyz/api/v1
                </code>
              </p>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <HeaderButton
              href="/openapi.yaml"
              download="openapi.yaml"
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              YAML
            </HeaderButton>
            <HeaderButton
              href="/openapi.yaml"
              download="openapi.json"
              leftIcon={<FileJson className="w-3.5 h-3.5" />}
            >
              JSON
            </HeaderButton>
            <HeaderButton
              href="/api"
              variant="primary"
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              API Home
            </HeaderButton>
          </div>
        </div>
      </div>
    </header>
  );
}
