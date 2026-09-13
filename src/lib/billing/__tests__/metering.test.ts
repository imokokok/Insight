import { getToolCreditCost } from '../metering';

describe('MCP tool metering', () => {
  it('charges agent_begin_trade as the two-leg attested gate', () => {
    expect(getToolCreditCost('agent_begin_trade')).toBe(10);
  });
});
