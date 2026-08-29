/**
 * MCP tool tiers must mirror the REST planGuard, or the same data costs money
 * on one surface and nothing on the other.
 *
 * The regression this file exists to catch: `oracle_watch` was Pro-gated on REST
 * (V1_STANDARD_MIDDLEWARES → planGuard) but absent from the MCP tier map, so it
 * defaulted to 'free'. A Free API key could pull the signal — and a signed
 * receipt — through MCP that the REST endpoint would have billed for.
 */

import { getToolTier, getToolTierLabel } from '../../tiers';

/** Tools whose REST counterpart is plan-guarded at minPlan 'pro'. */
const PRO_TOOLS = [
  'get_consensus_price',
  'pre_trade_safety_check',
  'oracle_watch',
  'oracle_watch_history',
  'get_feed_health',
];

describe('mcp tool tiers', () => {
  it.each(PRO_TOOLS)('gates %s at pro, matching its REST planGuard', (tool) => {
    expect(getToolTier(tool)).toBe('pro');
  });

  it('keeps Watch on the same tier as the pre-trade check it complements', () => {
    // Watch is the always-on companion to pre-trade; charging one and not the
    // other invites routing around the gate.
    expect(getToolTier('oracle_watch')).toBe(getToolTier('pre_trade_safety_check'));
  });

  it('keeps the Watch history tool on the same tier as the point signal', () => {
    expect(getToolTier('oracle_watch_history')).toBe(getToolTier('oracle_watch'));
  });

  it('gates protocol-level intelligence harder than pro', () => {
    expect(getToolTier('get_coverage')).toBe('protocol');
    expect(getToolTier('get_incidents')).toBe('protocol');
  });

  it('defaults an unlisted tool to free', () => {
    // The dangerous default: a new tool that forgets to register silently ships
    // as free. Listing Pro tools explicitly is the only defence.
    expect(getToolTier('a_tool_nobody_registered')).toBe('free');
  });

  it('badges gated tools and leaves free ones unlabelled', () => {
    expect(getToolTierLabel('oracle_watch')).toBe(' (Pro)');
    expect(getToolTierLabel('get_coverage')).toBe(' (Protocol)');
    expect(getToolTierLabel('get_oracle_price')).toBe('');
  });
});
