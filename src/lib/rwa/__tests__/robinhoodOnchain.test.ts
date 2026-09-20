import { readRobinhoodOnchainState } from '../robinhoodOnchain';

const mockReadContract = jest.fn();

jest.mock('viem', () => ({
  createPublicClient: () => ({ readContract: mockReadContract }),
  getAddress: (address: string) => address,
  http: jest.fn(() => ({})),
  parseAbi: jest.fn(() => []),
}));

jest.mock('viem/chains', () => ({ robinhood: { id: 4663, name: 'Robinhood Chain' } }));

const TOKEN = `0x${'12'.repeat(20)}` as `0x${string}`;
const UID = `0x${'34'.repeat(32)}` as `0x${string}`;

beforeEach(() => {
  mockReadContract.mockReset();
});

it('retains successful reads but labels a partial contract verification', async () => {
  mockReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === 'uid') return Promise.resolve(UID);
    if (functionName === 'uiMultiplier') return Promise.resolve(1_001_000_000_000_000_000n);
    if (functionName === 'newUIMultiplier') return Promise.resolve(1_001_000_000_000_000_000n);
    if (functionName === 'effectiveAt') return Promise.resolve(0n);
    return Promise.reject(new Error('pause read unavailable'));
  });

  const state = await readRobinhoodOnchainState(TOKEN, {
    rpcUrl: 'https://rpc.example',
    now: () => 1_800_000_000_000,
  });

  expect(state).toMatchObject({
    attempted: true,
    available: true,
    complete: false,
    rpcMode: 'configured',
    tokenUid: UID,
    currentMultiplierAtomic: '1001000000000000000',
    oraclePaused: null,
    verifiedAt: 1_800_000_000,
    errorCode: 'ROBINHOOD_ONCHAIN_READ_PARTIAL',
  });
});

it('does not claim multiplier availability when the current multiplier read fails', async () => {
  mockReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
    if (functionName === 'uid') return Promise.resolve(UID);
    if (functionName === 'uiMultiplier') return Promise.reject(new Error('current read failed'));
    if (functionName === 'oraclePaused') return Promise.resolve(false);
    return Promise.resolve(0n);
  });

  const state = await readRobinhoodOnchainState(TOKEN, { rpcUrl: 'https://rpc.example' });

  expect(state.available).toBe(false);
  expect(state.complete).toBe(false);
  expect(state.tokenUid).toBe(UID);
  expect(state.currentMultiplierAtomic).toBeNull();
  expect(state.errorCode).toBe('ROBINHOOD_ONCHAIN_READ_FAILED');
});
