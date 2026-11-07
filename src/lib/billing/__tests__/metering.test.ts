import { getToolCreditCost, getCreditCost } from '../metering';

describe('MCP tool metering', () => {
  it('prices unsigned supplied RWA diagnostics identically without charging for signing', () => {
    expect(getCreditCost('/api/v1/rwa/assessment')).toBe(2);
  });
  it('prices Robinhood issuer context as cached foundational evidence', () => {
    expect(getToolCreditCost('get_robinhood_rwa_context')).toBe(2);
    expect(getCreditCost('/api/v1/rwa/robinhood/context')).toBe(2);
  });
  it('prices MIC/FIGI admission consistently across REST and MCP', () => {
    expect(getToolCreditCost('get_robinhood_rwa_instrument')).toBe(2);
    expect(getCreditCost('/api/v1/rwa/robinhood/instrument')).toBe(2);
  });
  it('charges agent_begin_trade as the two-leg attested gate', () => {
    expect(getToolCreditCost('agent_begin_trade')).toBe(40);
  });
  it('prices execution preflight as a C3 decision gate, not a C4 receipt', () => {
    expect(getToolCreditCost('execution_preflight')).toBe(20);
    expect(getCreditCost('/api/v1/safety/preflight')).toBe(20);
  });

  it('prices reviewed Aerodrome evidence as C1 and unsigned preparation as C3', () => {
    expect(getCreditCost('/api/v1/markets/dex/aerodrome')).toBe(2);
    expect(getToolCreditCost('get_aerodrome_slipstream_market')).toBe(2);
    expect(getToolCreditCost('prepare_aerodrome_slipstream_swap')).toBe(20);
  });

  it('prices both Base Perp Guard tools and their REST route as C3 decision gates', () => {
    expect(getToolCreditCost('base_perp_guard')).toBe(20);
    expect(getToolCreditCost('base_perp_guard_exact_call')).toBe(20);
    expect(getCreditCost('/api/v1/safety/base-perp-guard')).toBe(20);
  });
});
