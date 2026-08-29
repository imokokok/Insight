import {
  HISTORY_UNIVERSE_NOTE,
  ORACLE_WATCH_HISTORY_CHAINS,
  ORACLE_WATCH_HISTORY_UNIVERSE,
  hasAnyHistoryCoverage,
  isInHistoryUniverse,
} from '../oracleWatchUniverse';

describe('oracleWatchUniverse', () => {
  it('recognises every committed pair', () => {
    for (const pair of ORACLE_WATCH_HISTORY_UNIVERSE) {
      expect(isInHistoryUniverse(pair.symbol, pair.chain)).toBe(true);
    }
  });

  it('rejects a chain we do not publish history for', () => {
    // The motivating failure: a strategy on Arbitrum ETH used to get an empty
    // series that read as "no incidents".
    expect(isInHistoryUniverse('ETH', 'arbitrum')).toBe(true);
    expect(isInHistoryUniverse('ETH', 'solana')).toBe(false);
  });

  it('treats an omitted chain as "this symbol is covered somewhere"', () => {
    // No chain means the global query, which is served by the global spine the
    // collector writes for every symbol in its list — so history DOES exist.
    // Only an explicit chain can fall outside the promise.
    expect(isInHistoryUniverse('ETH', null)).toBe(true);
    expect(isInHistoryUniverse('ETH', undefined)).toBe(true);
    expect(isInHistoryUniverse('DOGE', null)).toBe(false);
  });

  it('is case-insensitive on both dimensions', () => {
    expect(isInHistoryUniverse('eth', 'Ethereum')).toBe(true);
    expect(isInHistoryUniverse('usdc', 'BASE')).toBe(true);
  });

  it('rejects symbols outside the universe entirely', () => {
    expect(isInHistoryUniverse('DOGE', 'ethereum')).toBe(false);
  });

  it('distinguishes "not on this chain" from "not covered at all"', () => {
    expect(hasAnyHistoryCoverage('ETH')).toBe(true);
    expect(hasAnyHistoryCoverage('DOGE')).toBe(false);
    // ETH is covered, just not on Solana — a different remediation.
    expect(isInHistoryUniverse('ETH', 'solana')).toBe(false);
    expect(hasAnyHistoryCoverage('ETH')).toBe(true);
  });

  it('publishes only the chains it actually collects', () => {
    for (const pair of ORACLE_WATCH_HISTORY_UNIVERSE) {
      expect(ORACLE_WATCH_HISTORY_CHAINS).toContain(pair.chain);
    }
  });

  it('keeps the universe bounded — every entry costs a 30-minute evaluation forever', () => {
    // Not a correctness property, a cost one. If this trips, the decision to
    // widen the promise should be deliberate rather than accidental.
    expect(ORACLE_WATCH_HISTORY_UNIVERSE.length).toBeLessThanOrEqual(24);
  });

  it('states the promise in a form callers can surface verbatim', () => {
    expect(HISTORY_UNIVERSE_NOTE).toContain('ethereum');
    expect(HISTORY_UNIVERSE_NOTE).toContain('point signal');
  });
});
