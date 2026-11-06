/**
 * One-hand on-chain verification of a reviewed Morpho Blue Base market anchor
 * (P1-1a reviewedMorphoBlueBaseMarkets registration input).
 *
 * Reads, directly from https://mainnet.base.org (no third-party API):
 *   1. vault.asset()                     -> must equal Base USDC
 *   2. vault.withdrawQueueLength()/withdrawQueue(i) -> market ids
 *   3. vault.supplyQueueLength()/supplyQueue(i)     -> market ids
 *   4. morphoBlue.idToMarketParams(id)   -> immutable tuple
 *   5. keccak256(abi.encode(tuple))      -> must equal id (recompute)
 *   6. morphoBlue.market(id)             -> totalSupplyAssets/totalBorrowAssets (activity)
 *
 * Usage: node scripts/verify-morpho-base-reviewed-market.mjs [vaultAddress]
 * Exit code 0 iff at least one market fully verifies.
 */
import { createPublicClient, http, encodeAbiParameters, keccak256, parseAbiParameters } from 'viem';

const RPC_URL = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
const MORPHO_BLUE_BASE = '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb';
const BASE_USDC = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';
const DEFAULT_VAULT = '0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61'; // Gauntlet USDC Prime (two independent secondary sources; verified on-chain here)

const vaultAddress = (process.argv[2] ?? DEFAULT_VAULT).toLowerCase();

const client = createPublicClient({ transport: http(RPC_URL, { timeout: 30_000 }) });

const ERC4626_ASSET_ABI = [
  { name: 'asset', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
];
const QUEUE_ABI = [
  { name: 'withdrawQueueLength', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'withdrawQueue', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
  { name: 'supplyQueueLength', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'supplyQueue', type: 'function', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'bytes32' }] },
];
const MARKET_PARAMS_ABI = parseAbiParameters('address loanToken, address collateralToken, address oracle, address irm, uint256 lltv');
const ID_TO_MARKET_PARAMS_ABI = [
  {
    name: 'idToMarketParams',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'bytes32' }],
    outputs: [
      { type: 'address', name: 'loanToken' },
      { type: 'address', name: 'collateralToken' },
      { type: 'address', name: 'oracle' },
      { type: 'address', name: 'irm' },
      { type: 'uint256', name: 'lltv' },
    ],
  },
];
const MARKET_STATE_ABI = [
  {
    name: 'market',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'bytes32' }],
    outputs: [
      { type: 'uint256', name: 'totalSupplyAssets' },
      { type: 'uint256', name: 'totalSupplyShares' },
      { type: 'uint256', name: 'totalBorrowAssets' },
      { type: 'uint256', name: 'totalBorrowShares' },
      { type: 'uint256', name: 'lastUpdate' },
      { type: 'uint256', name: 'fee' },
    ],
  },
];

function keccakOfParams(p) {
  return keccak256(
    encodeAbiParameters(MARKET_PARAMS_ABI, [p.loanToken, p.collateralToken, p.oracle, p.irm, p.lltv])
  );
}

async function main() {
  const code = await client.getBytecode({ address: vaultAddress });
  if (!code || code === '0x') throw new Error(`vault ${vaultAddress} has no code`);

  const asset = (await client.readContract({ address: vaultAddress, abi: ERC4626_ASSET_ABI, functionName: 'asset' })).toLowerCase();
  console.log(`vault            ${vaultAddress}`);
  console.log(`asset()          ${asset}  ${asset === BASE_USDC ? '== Base USDC OK' : '!= Base USDC MISMATCH'}`);

  const ids = new Set();
  const wLen = await client.readContract({ address: vaultAddress, abi: QUEUE_ABI, functionName: 'withdrawQueueLength' });
  for (let i = 0n; i < wLen; i++) {
    ids.add(await client.readContract({ address: vaultAddress, abi: QUEUE_ABI, functionName: 'withdrawQueue', args: [i] }));
  }
  const sLen = await client.readContract({ address: vaultAddress, abi: QUEUE_ABI, functionName: 'supplyQueueLength' });
  for (let i = 0n; i < sLen; i++) {
    ids.add(await client.readContract({ address: vaultAddress, abi: QUEUE_ABI, functionName: 'supplyQueue', args: [i] }));
  }
  console.log(`market ids seen  ${ids.size} (withdrawQueue=${wLen}, supplyQueue=${sLen})`);

  let verifiedAny = false;
  for (const id of ids) {
    const p = await client.readContract({ address: MORPHO_BLUE_BASE, abi: ID_TO_MARKET_PARAMS_ABI, functionName: 'idToMarketParams', args: [id] });
    const params = Array.isArray(p) ? { loanToken: p[0], collateralToken: p[1], oracle: p[2], irm: p[3], lltv: p[4] } : p;
    const recomputed = keccakOfParams({
      loanToken: params.loanToken,
      collateralToken: params.collateralToken,
      oracle: params.oracle,
      irm: params.irm,
      lltv: params.lltv,
    });
    const idMatches = recomputed.toLowerCase() === id.toLowerCase();
    const stateRaw = await client.readContract({ address: MORPHO_BLUE_BASE, abi: MARKET_STATE_ABI, functionName: 'market', args: [id] });
    const s = Array.isArray(stateRaw) ? { totalSupplyAssets: stateRaw[0], totalBorrowAssets: stateRaw[2] } : stateRaw;
    const supply = s.totalSupplyAssets;
    const borrow = s.totalBorrowAssets;
    const loanAssetMatch = params.loanToken.toLowerCase() === BASE_USDC;
    // Non-zero param addresses must carry on-chain code (no fabricated/empty oracle or irm).
    const codeChecks = {};
    for (const [label, addr] of [['collateralToken', params.collateralToken], ['oracle', params.oracle], ['irm', params.irm]]) {
      if (addr && addr !== '0x0000000000000000000000000000000000000000') {
        const bc = await client.getBytecode({ address: addr });
        codeChecks[label] = bc && bc !== '0x' ? 'has-code' : 'NO-CODE';
      } else {
        codeChecks[label] = 'zero-addr';
      }
    }
    const codesOk = Object.values(codeChecks).every((v) => v !== 'NO-CODE');
    const ok = idMatches && loanAssetMatch && supply > 0n && codesOk;
    if (ok) verifiedAny = true;
    console.log(
      `\nid=${id}\n  params      loan=${params.loanToken} collateral=${params.collateralToken}\n              oracle=${params.oracle}\n              irm=${params.irm} lltv=${params.lltv}\n  keccak      ${recomputed}  ${idMatches ? 'MATCH' : 'MISMATCH'}\n  supplyAssets=${supply} borrowAssets=${borrow}  loanIsUSDC=${loanAssetMatch}\n  code        ${JSON.stringify(codeChecks)}\n  verdict     ${ok ? 'REVIEW-ELIGIBLE' : 'not eligible'}`
    );
  }
  if (!verifiedAny) throw new Error('no market fully verified');
  console.log('\nRESULT: at least one market fully verified on-chain');
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
