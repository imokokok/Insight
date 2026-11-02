import { readGithubFallbackGraceMs, shouldDeferGithubFallback } from '@/lib/reports/snapshotIngest';

describe('GitHub snapshot-ingest fallback guard', () => {
  it('defers a GitHub collector only during the configured primary grace window', () => {
    const slotMs = Date.UTC(2026, 10, 2, 15, 0, 0);
    const graceMs = readGithubFallbackGraceMs('420');

    expect(
      shouldDeferGithubFallback(true, 'github_actions', slotMs, slotMs + 419_999, graceMs)
    ).toBe(true);
    expect(
      shouldDeferGithubFallback(true, 'github_actions', slotMs, slotMs + graceMs, graceMs)
    ).toBe(false);
  });

  it('never delays Cloudflare or manual collection', () => {
    const slotMs = Date.UTC(2026, 10, 2, 15, 0, 0);
    const graceMs = readGithubFallbackGraceMs('420');

    expect(shouldDeferGithubFallback(true, 'cloudflare_cron', slotMs, slotMs, graceMs)).toBe(false);
    expect(shouldDeferGithubFallback(true, 'manual', slotMs, slotMs, graceMs)).toBe(false);
    expect(shouldDeferGithubFallback(false, 'github_actions', slotMs, slotMs, graceMs)).toBe(false);
  });

  it('validates the environment boundary', () => {
    expect(readGithubFallbackGraceMs()).toBe(0);
    expect(() => readGithubFallbackGraceMs('-1')).toThrow('must be an integer');
    expect(() => readGithubFallbackGraceMs('841')).toThrow('between 0 and 840');
  });
});
