import { Blockchain } from '@/types/oracle';

import { resolveOracleFeedBlockchain } from '../feedChain';

describe('resolveOracleFeedBlockchain', () => {
  it('identifies source-bound native Solana rows without changing generic chain-0 behavior', () => {
    expect(
      resolveOracleFeedBlockchain({
        provider: 'pyth',
        chain_id: 0,
        source: 'pyth-solana-sponsored-registry',
        metadata: { solanaNetwork: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
      })
    ).toBe(Blockchain.SOLANA);
    expect(
      resolveOracleFeedBlockchain({
        provider: 'chainlink',
        chain_id: 0,
        source: 'chainlink-solana-rdd',
        metadata: { solanaNetwork: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' },
      })
    ).toBe(Blockchain.SOLANA);
    expect(
      resolveOracleFeedBlockchain({
        provider: 'redstone',
        chain_id: 0,
        source: 'hardcoded',
      })
    ).toBeUndefined();
    expect(resolveOracleFeedBlockchain({ provider: 'pyth', chain_id: 143 })).toBe(Blockchain.MONAD);
  });
});
