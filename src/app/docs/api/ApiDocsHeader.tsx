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
    'inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2';
  const variants = {
    primary:
      'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 active:scale-[0.98] shadow-sm',
    secondary:
      'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 active:scale-[0.98]',
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4">
          {/* Left: title & meta */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="hidden sm:flex w-10 h-10 bg-blue-50 rounded-lg items-center justify-center text-blue-600 shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
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
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 truncate">
                Insight Oracle API
              </h1>
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
