describe('getRpcEndpoints', () => {
  const rpcEnvironmentKeys = [
    'ALCHEMY_SOLANA_RPC',
    'EXECUTION_RPC_0',
    'HELIUS_SOLANA_RPC',
  ] as const;
  const originalValues = new Map(rpcEnvironmentKeys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of rpcEnvironmentKeys) {
      const original = originalValues.get(key);
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    }
    jest.resetModules();
  });

  async function loadEndpoints(
    values: Partial<Record<(typeof rpcEnvironmentKeys)[number], string>>
  ) {
    for (const key of rpcEnvironmentKeys) delete process.env[key];
    Object.assign(process.env, values);
    jest.resetModules();
    return (await import('../rpcEndpoints')).getRpcEndpoints;
  }

  it('prefers Helius for Solana while retaining Alchemy and the public node as fallbacks', async () => {
    const getRpcEndpoints = await loadEndpoints({
      HELIUS_SOLANA_RPC: 'https://mainnet.helius-rpc.com/?api-key=test-key-12345678',
      ALCHEMY_SOLANA_RPC: 'https://solana-mainnet.g.alchemy.com/v2/test-key-12345678',
    });

    expect(getRpcEndpoints(0)).toEqual([
      'https://mainnet.helius-rpc.com/?api-key=test-key-12345678',
      'https://solana-mainnet.g.alchemy.com/v2/test-key-12345678',
      'https://api.mainnet-beta.solana.com',
    ]);
  });

  it('retains an explicit Solana override as the highest-priority configuration', async () => {
    const getRpcEndpoints = await loadEndpoints({
      EXECUTION_RPC_0: 'https://operator.example.test/rpc',
      HELIUS_SOLANA_RPC: 'https://mainnet.helius-rpc.com/?api-key=test-key-12345678',
      ALCHEMY_SOLANA_RPC: 'https://solana-mainnet.g.alchemy.com/v2/test-key-12345678',
    });

    expect(getRpcEndpoints(0)).toEqual(['https://operator.example.test/rpc']);
  });

  it('does not change non-Solana endpoint priority', async () => {
    const getRpcEndpoints = await loadEndpoints({
      HELIUS_SOLANA_RPC: 'https://mainnet.helius-rpc.com/?api-key=test-key-12345678',
    });

    expect(getRpcEndpoints(1)).toEqual([
      'https://eth.llamarpc.com',
      'https://ethereum.publicnode.com',
    ]);
  });
});
