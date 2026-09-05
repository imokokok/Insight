'use client';

import { useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { OPS_NAV } from './nav';

const ENV_TONE: Record<string, string> = {
  PROD: 'bg-danger-50 text-danger-700',
  STAGING: 'bg-warning-50 text-warning-700',
  DEV: 'bg-gray-100 text-gray-600',
};

export default function OpsSidebar({ env = 'PROD' }: { env?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navList = (
    <nav className="space-y-1 border-t border-slate-900/10 pt-4">
      {OPS_NAV.map((group) => (
        <div key={group.title} className="mb-3">
          <div className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {group.title}
          </div>
          {group.items.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={
                  active
                    ? 'relative flex items-center gap-2.5 border-r-2 border-primary-700 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700'
                    : 'flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100'
                }
              >
                {active && (
                  <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 bg-primary-600" />
                )}
                <Icon className="w-4 h-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const envBadge = (
    <span
      className={`inline-flex items-center border-l-2 border-current px-2 py-0.5 text-xs font-medium ${ENV_TONE[env] ?? ENV_TONE.DEV}`}
    >
      {env}
    </span>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden min-h-screen w-60 shrink-0 flex-col border-r border-slate-900/15 bg-white/70 p-4 lg:flex">
        <Link
          href="/"
          className="group mb-4 flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
          aria-label="返回 Insight 主站"
        >
          <Image
            src="/logos/insight-glacier-cut.svg"
            alt="Insight"
            width={24}
            height={30}
            className="group-hover:scale-105 transition-transform duration-300"
          />
          <div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
              Insight
            </div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
              Internal Ops Console
            </div>
          </div>
        </Link>
        <div className="flex-1 overflow-y-auto">{navList}</div>
        <div className="mt-4 px-3 py-2 border-t border-gray-100 flex items-center gap-2 text-xs">
          {envBadge}
          <span className="text-gray-400">Environment</span>
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="lg:hidden">
        <div className="fixed top-0 inset-x-0 h-12 z-40 flex items-center gap-2 px-3 bg-white border-b border-gray-200">
          <button
            type="button"
            aria-label="打开菜单"
            onClick={() => setOpen(true)}
            className="p-1.5 text-gray-600 hover:bg-gray-100"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2 group" aria-label="返回 Insight 主站">
            <Image
              src="/logos/insight-glacier-cut.svg"
              alt="Insight"
              width={16}
              height={20}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            <span className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
              Insight
            </span>
          </Link>
        </div>
        {open && (
          <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-gray-900/40" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-60 max-w-[80%] overflow-y-auto border-r border-gray-200 bg-[#f8f7f4] p-4">
              <div className="mb-4 flex items-center justify-between">
                <Link
                  href="/"
                  className="group flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                  aria-label="返回 Insight 主站"
                >
                  <Image
                    src="/logos/insight-glacier-cut.svg"
                    alt="Insight"
                    width={24}
                    height={30}
                    className="group-hover:scale-105 transition-transform duration-300"
                  />
                  <div>
                    <div className="text-sm font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                      Insight
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-gray-500">
                      Internal Ops Console
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label="关闭菜单"
                  onClick={() => setOpen(false)}
                  className="p-1.5 text-gray-500 hover:bg-gray-100"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {navList}
              <div className="mt-4 px-3 py-2 border-t border-gray-100">{envBadge}</div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
