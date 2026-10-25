/**
 * Read-only release probe for every chain with a native Lending Guard.
 * It verifies the reviewed deployment identities through live RPC before a
 * release; it never simulates user funds or sends a transaction.
 */

import { AaveV3Base } from '@aave-dao/aave-address-book';

import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import {
  COMPOUND_V3_BASE_COMET,
  MOONWELL_BASE_COMPTROLLER,
} from '@/lib/lending/baseLendingProtocols';
import { AAVE_V3_MONAD_POOL } from '@/lib/lending/monadLendingProtocols';
import {
  AAVE_V3_EVM_MARKETS,
  VENUS_CORE_POOL_COMPTROLLER,
} from '@/lib/lending/multichainEvmLendingProtocols';
import { KAMINO_LEND_PROGRAM_ID, MARGINFI_V2_PROGRAM_ID } from '@/lib/lending/solanaLendingAction';
import { CHAINLINK_RPC_CONFIG } from '@/lib/oracles/services/chainlinkDataSources/rpcConfig';

type EvmProbe = {
  name: string;
  chainId: 8453 | 143 | 137 | 42161 | 56;
  contracts: string[];
  viewCalls?: Array<{ to: string; data: `0x${string}` }>;
};
const EVM_PROBES: EvmProbe[] = [
  {
    name: 'Base',
    chainId: 8453,
    contracts: [AaveV3Base.POOL, COMPOUND_V3_BASE_COMET, MOONWELL_BASE_COMPTROLLER],
  },
  {
    name: 'Monad',
    chainId: 143,
    // Monad's public RPC presently rejects eth_getCode, while it serves the
    // view-call path used by the guard. Pin a non-empty Aave reserve-list read
    // instead of treating an RPC-method incompatibility as deployment absence.
    contracts: [],
    viewCalls: [{ to: AAVE_V3_MONAD_POOL, data: '0xd1946dbc' }],
  },
  { name: 'Polygon', chainId: 137, contracts: [AAVE_V3_EVM_MARKETS['aave-v3-polygon'].pool] },
  { name: 'Arbitrum', chainId: 42161, contracts: [AAVE_V3_EVM_MARKETS['aave-v3-arbitrum'].pool] },
  {
    name: 'BNB Chain',
    chainId: 56,
    contracts: [AAVE_V3_EVM_MARKETS['aave-v3-bnb'].pool, VENUS_CORE_POOL_COMPTROLLER],
  },
];
const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

async function rpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: `insight-live-${method}`, method, params }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`${method} returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || body.error !== undefined || !('result' in body)) {
    throw new Error(`${method} returned an invalid RPC response`);
  }
  return body.result;
}
async function probeEvm(probe: EvmProbe): Promise<Record<string, unknown>> {
  const endpoints = CHAINLINK_RPC_CONFIG[probe.chainId]?.endpoints ?? [];
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      const chainId = await rpc(endpoint, 'eth_chainId', []);
      if (chainId !== `0x${probe.chainId.toString(16)}`) continue;
      const codes = await Promise.all(
        probe.contracts.map((address) => rpc(endpoint, 'eth_getCode', [address, 'latest']))
      );
      if (codes.some((code) => typeof code !== 'string' || code === '0x')) {
        throw new Error('A reviewed lending deployment has no bytecode');
      }
      const views = await Promise.all(
        (probe.viewCalls ?? []).map(({ to, data }) =>
          rpc(endpoint, 'eth_call', [{ to, data }, 'latest'])
        )
      );
      if (views.some((value) => typeof value !== 'string' || value === '0x')) {
        throw new Error('A reviewed lending deployment returned an empty view result');
      }
      return {
        chain: probe.name,
        chainId: probe.chainId,
        endpoint: new URL(endpoint).host,
        contracts: probe.contracts.length,
        viewCalls: probe.viewCalls?.length ?? 0,
      };
    } catch (error) {
      last = error;
    }
  }
  throw new Error(
    `${probe.name}: ${last instanceof Error ? last.message : 'no RPC endpoint succeeded'}`
  );
}
async function probeSolana(): Promise<Record<string, unknown>> {
  const endpoints = getRpcEndpoints(0) ?? [];
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      if ((await rpc(endpoint, 'getGenesisHash', [])) !== SOLANA_MAINNET_GENESIS_HASH) continue;
      const programs = await Promise.all(
        [KAMINO_LEND_PROGRAM_ID, MARGINFI_V2_PROGRAM_ID].map((address) =>
          rpc(endpoint, 'getAccountInfo', [
            address,
            { encoding: 'base64', commitment: 'confirmed', dataSlice: { offset: 0, length: 0 } },
          ])
        )
      );
      if (programs.some((response) => !isExecutableSolanaProgram(response))) {
        throw new Error('A reviewed Solana lending program is missing or not executable');
      }
      return { chain: 'Solana', chainId: 0, endpoint: new URL(endpoint).host, programs: 2 };
    } catch (error) {
      last = error;
    }
  }
  throw new Error(`Solana: ${last instanceof Error ? last.message : 'no RPC endpoint succeeded'}`);
}
function isExecutableSolanaProgram(value: unknown): boolean {
  return isRecord(value) && isRecord(value.value) && value.value.executable === true;
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

const results = await Promise.all([...EVM_PROBES.map(probeEvm), probeSolana()]);
process.stdout.write(
  `${JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2)}\n`
);
