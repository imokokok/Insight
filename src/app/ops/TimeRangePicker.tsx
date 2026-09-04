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
    <div role="group" aria-label="时间范围" className="inline-flex border border-gray-300 bg-white">
      {RANGES.map((r) => {
        const active = current === r.key;
        return (
          <Link
            key={r.key}
            href={`${pathname}?range=${r.key}`}
            className={
              active
                ? 'border-r border-primary-700 bg-primary-700 px-3 py-1 text-sm font-medium text-white'
                : 'border-r border-gray-200 px-3 py-1 text-sm text-gray-600 last:border-r-0 hover:bg-primary-50 hover:text-primary-700'
            }
          >
            {r.label}
          </Link>
        );
      })}
    </div>
  );
}
