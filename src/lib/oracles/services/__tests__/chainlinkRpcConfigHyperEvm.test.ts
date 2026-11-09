import { CHAINLINK_RPC_CONFIG } from '../chainlinkDataSources/rpcConfig';

describe('CHAINLINK_RPC_CONFIG HyperEVM endpoints', () => {
  const REVIEWED_ENDPOINT = 'https://rpc.hyperliquid.xyz/evm';

  afterEach(() => {
    delete process.env.EXECUTION_RPC_999;
  });

  it('uses only the reviewed public endpoint by default', () => {
    delete process.env.EXECUTION_RPC_999;
    expect(CHAINLINK_RPC_CONFIG[999].endpoints).toEqual([REVIEWED_ENDPOINT]);
  });

  it('resolves EXECUTION_RPC_999 overrides at module load, ahead of the reviewed endpoint', async () => {
    process.env.EXECUTION_RPC_999 =
      ' https://evm.dedicated-provider.example/v1/key , https://backup.example/evm ';
    jest.resetModules();
    const { CHAINLINK_RPC_CONFIG: fresh } = await import('../chainlinkDataSources/rpcConfig');
    expect(fresh[999].endpoints).toEqual([
      'https://evm.dedicated-provider.example/v1/key',
      'https://backup.example/evm',
      REVIEWED_ENDPOINT,
    ]);
  });

  it('ignores blank and empty override entries', () => {
    process.env.EXECUTION_RPC_999 = '  , , ';
    jest.resetModules();
    expect(CHAINLINK_RPC_CONFIG[999].endpoints).toEqual([REVIEWED_ENDPOINT]);
  });
});
