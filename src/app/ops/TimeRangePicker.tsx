'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { RANGES, type RangeKey } from './range';

/**
 * URL-driven time-range switcher. Uses `usePathname` (not `useSearchParams`) so
 * it does not require a Suspense boundary during static analysis. The server
 * page reads the same `?range=` value and feeds `windowHours` to the queries.
 */
export default function TimeRangePicker({ current }: { current: RangeKey | string }) {
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label="时间范围"
      className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
    >
      {RANGES.map((r) => {
        const active = current === r.key;
        return (
          <Link
            key={r.key}
            href={`${pathname}?range=${r.key}`}
            className={
              active
                ? 'px-3 py-1 rounded-md text-sm font-medium bg-slate-900 text-white'
                : 'px-3 py-1 rounded-md text-sm text-slate-600 hover:bg-slate-100'
            }
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
