import { isFreeVerifyCall } from '../freeVerify';

describe('isFreeVerifyCall', () => {
  const original = process.env.MCP_FREE_VERIFY_KINDS;
  afterEach(() => {
    if (original === undefined) delete process.env.MCP_FREE_VERIFY_KINDS;
    else process.env.MCP_FREE_VERIFY_KINDS = original;
  });

  it('treats the three offline verification kinds as free on the unified tool', () => {
    for (const kind of ['execution_pair', 'base_agent_swap', 'solana_swap']) {
      expect(isFreeVerifyCall('verify_evidence', { kind })).toBe(true);
    }
  });

  it('keeps live-read and attested verification kinds billable', () => {
    expect(isFreeVerifyCall('verify_evidence', { kind: 'hyperliquid_perp' })).toBe(false);
    expect(isFreeVerifyCall('verify_evidence')).toBe(false);
    expect(isFreeVerifyCall('verify_evidence', { kind: 'something_else' })).toBe(false);
  });

  it('only applies to verify tools, not to other tools with a kind argument', () => {
    expect(isFreeVerifyCall('pre_trade_safety_check', { kind: 'execution_pair' })).toBe(false);
  });

  it('keeps the legacy per-kind tool names free during the compatibility window', () => {
    expect(isFreeVerifyCall('verify_execution_pair')).toBe(true);
    expect(isFreeVerifyCall('verify_base_agent_swap_guard_settlement')).toBe(true);
    expect(isFreeVerifyCall('verify_solana_swap_guard_settlement')).toBe(true);
    expect(isFreeVerifyCall('verify_hyperliquid_perp_execution')).toBe(false);
  });

  it('honours MCP_FREE_VERIFY_KINDS as an override', () => {
    process.env.MCP_FREE_VERIFY_KINDS = 'execution_pair';
    expect(isFreeVerifyCall('verify_evidence', { kind: 'execution_pair' })).toBe(true);
    expect(isFreeVerifyCall('verify_evidence', { kind: 'base_agent_swap' })).toBe(false);

    process.env.MCP_FREE_VERIFY_KINDS = '';
    expect(isFreeVerifyCall('verify_evidence', { kind: 'execution_pair' })).toBe(false);
  });

  it('applies the same override to the legacy per-kind tool names', () => {
    // Regression: the legacy names used to return early with `true`, so the
    // documented kill switch could never restore billing for them.
    process.env.MCP_FREE_VERIFY_KINDS = 'execution_pair';
    expect(isFreeVerifyCall('verify_execution_pair')).toBe(true);
    expect(isFreeVerifyCall('verify_base_agent_swap_guard_settlement')).toBe(false);
    expect(isFreeVerifyCall('verify_solana_swap_guard_settlement')).toBe(false);

    process.env.MCP_FREE_VERIFY_KINDS = '';
    expect(isFreeVerifyCall('verify_execution_pair')).toBe(false);
    expect(isFreeVerifyCall('verify_base_agent_swap_guard_settlement')).toBe(false);
    expect(isFreeVerifyCall('verify_solana_swap_guard_settlement')).toBe(false);
  });
});
