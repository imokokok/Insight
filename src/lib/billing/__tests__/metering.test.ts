import { getToolCreditCost, getCreditCost } from '../metering';

describe('MCP tool metering', () => {
  it('prices unsigned supplied RWA diagnostics identically without charging for signing', () => {
    expect(getToolCreditCost('assess_rwa_evidence')).toBe(0.5);
    expect(getCreditCost('/api/v1/rwa/assessment')).toBe(0.5);
  });
  it('prices Robinhood issuer context as cached foundational evidence', () => {
    expect(getToolCreditCost('get_robinhood_rwa_context')).toBe(0.5);
    expect(getCreditCost('/api/v1/rwa/robinhood/context')).toBe(0.5);
  });
  it('prices MIC/FIGI admission consistently across REST and MCP', () => {
    expect(getToolCreditCost('get_robinhood_rwa_instrument')).toBe(0.5);
    expect(getCreditCost('/api/v1/rwa/robinhood/instrument')).toBe(0.5);
  });
  it('charges agent_begin_trade as the two-leg attested gate', () => {
    expect(getToolCreditCost('agent_begin_trade')).toBe(10);
  });
});
