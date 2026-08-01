/**
 * Lightweight concurrency limiter for bounding parallel async work.
 *
 * Designed as a pure-performance replacement for unbounded `Promise.all(map)`
 * patterns: results are returned in the SAME order as the input array, so
 * swapping `Promise.all(items.map(fn))` → `mapWithConcurrency(items, n, fn)`
 * does not change observable behavior.
 */

/**
 * Run an async mapper over an array with a bounded number of in-flight
 * operations. Preserves input order in the returned results array.
 *
 * Behavior contract (must match `Promise.all(items.map(fn))`):
 *  - Results appear in the same index order as `items`.
 *  - If any mapper rejects, the returned promise rejects with the same error.
 *  - Mappers are invoked lazily as concurrency slots free up.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let active = 0;
  let rejected = false;

  return new Promise<R[]>((resolve, reject) => {
    if (items.length === 0) {
      resolve(results);
      return;
    }

    const launchNext = () => {
      // Stop scheduling once a rejection has propagated.
      while (active < limit && cursor < items.length && !rejected) {
        const currentIndex = cursor++;
        active++;

        Promise.resolve()
          .then(() => mapper(items[currentIndex], currentIndex))
          .then(
            (value) => {
              if (rejected) return;
              results[currentIndex] = value;
              active--;
              if (cursor < items.length) {
                launchNext();
              } else if (active === 0) {
                resolve(results);
              }
            },
            (error) => {
              if (rejected) return;
              rejected = true;
              reject(error);
            }
          );
      }
    };

    launchNext();
  });
}
