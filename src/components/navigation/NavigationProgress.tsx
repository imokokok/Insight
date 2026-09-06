'use client';

import { useEffect, useRef, useState } from 'react';

import { usePathname, useSearchParams } from 'next/navigation';

function isInternalNavigation(event: MouseEvent): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey
  ) {
    return false;
  }
  const anchor = (event.target as Element | null)?.closest('a');
  if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  return url.pathname !== window.location.pathname || url.search !== window.location.search;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const timerRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const start = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setPending(true), 80);
      if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = window.setTimeout(() => setPending(false), 10_000);
    };
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigation(event)) start();
    };
    document.addEventListener('click', handleClick, true);
    window.addEventListener('popstate', start);
    return () => {
      document.removeEventListener('click', handleClick, true);
      window.removeEventListener('popstate', start);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (safetyTimerRef.current) window.clearTimeout(safetyTimerRef.current);
    timerRef.current = null;
    safetyTimerRef.current = null;
    const frame = window.requestAnimationFrame(() => setPending(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, searchParams]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 origin-left bg-blue-600 transition-[transform,opacity] duration-200 ${
        pending ? 'scale-x-[0.72] opacity-100' : 'scale-x-0 opacity-0'
      }`}
    />
  );
}
