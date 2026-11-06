/**
 * One-hand on-chain ranking of Euler V2 Monad EVaults (P1-1b reviewed vault
 * registration input). Vault list comes from the official Euler Labs
 * "euler-simple-monad" Goldsky subgraph (saved to /tmp/euler-monad-vaults.json
 * by the caller), then every vault is verified and ranked DIRECTLY on
 * https://rpc2.monad.xyz via Multicall3:
 *   - factory.isProxy(vault)  -> created by canonical eVaultFactory
 *   - vault.EVC()             -> wired to canonical EVC
 *   - vault.asset()/name()/totalAssets()
 *   - asset.symbol()/decimals()
 *
 * Usage: node scripts/verify-euler-monad-vaults.mjs
 */
import { createPublicClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { readFileSync } from 'node:fs';

const RPC_URL = process.env.MONAD_RPC_URL ?? 'https://rpc2.monad.xyz';
const FACTORY = '0xba4Dd672062dE8FeeDb665DD4410658864483f1E';
const EVC = '0x7a9324E8f270413fa2E458f5831226d99C7477CD';
const MULTICALL3 = '0xca11bde05977b3631167028862be2a173976ca11';

const vaults = JSON.parse(readFileSync('/tmp/euler-monad-vaults.json', 'utf8'));
const client = createPublicClient({ transport: http(RPC_URL, { timeout: 60_000 }) });

const MC3_ABI = [
  {
    name: 'aggregate3',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'allowFailure', type: 'bool' },
          { name: 'value', type: 'uint256' },
          { name: 'callData', type: 'bytes' },
        ],
      },
    ],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'success', type: 'bool' },
          { name: 'returnData', type: 'bytes' },
        ],
      },
    ],
  },
];
const FACTORY_ABI = [
  { name: 'isProxy', type: 'function', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'bool' }] },
];
const VAULT_ABI = [
  { name: 'EVC', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'asset', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'name', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'totalAssets', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
];
const ERC20_ABI = [
  { name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { name: 'decimals', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
];

function call(target, abi, fn, args = []) {
  return {
    target,
    allowFailure: true,
    value: 0n,
    callData: encodeFunctionData({ abi, functionName: fn, args }),
  };
}

async function batch(calls) {
  const out = [];
  const CHUNK = 30;
  for (let i = 0; i < calls.length; i += CHUNK) {
    const slice = calls.slice(i, i + CHUNK);
    try {
      const res = await client.readContract({
        address: MULTICALL3,
        abi: MC3_ABI,
        functionName: 'aggregate3',
        args: [slice],
      });
      out.push(...res);
      continue;
    } catch (e) {
      if (i === 0) console.log('multicall unavailable, falling back to sequential eth_call');
    }
    // fallback: sequential direct calls
    for (const c of slice) {
      try {
        const data = await client.call({ to: c.target, data: c.callData });
        out.push({ success: true, returnData: data.data ?? '0x' });
      } catch {
        out.push({ success: false, returnData: '0x' });
      }
    }
  }
  return out;
}

async function main() {
  console.log(`ranking ${vaults.length} vaults on ${RPC_URL}`);
  const calls = [];
  for (const v of vaults) {
    calls.push(call(FACTORY, FACTORY_ABI, 'isProxy', [v]));
    calls.push(call(v, VAULT_ABI, 'EVC'));
    calls.push(call(v, VAULT_ABI, 'asset'));
    calls.push(call(v, VAULT_ABI, 'name'));
    calls.push(call(v, VAULT_ABI, 'totalAssets'));
  }
  const res = await batch(calls);

  const rows = [];
  for (let i = 0; i < vaults.length; i++) {
    const r = res.slice(i * 5, i * 5 + 5);
    const isProxy = r[0].success && r[0].returnData === '0x' + '1'.padStart(64, '0');
    const evc = r[1].success ? '0x' + r[1].returnData.slice(26) : null;
    const asset = r[2].success ? '0x' + r[2].returnData.slice(26) : '';
    let name = '';
    if (r[3].success) {
      try {
        name = decodeFunctionResult({ abi: VAULT_ABI, functionName: 'name', data: r[3].returnData });
      } catch { /* ignore */ }
    }
    const ta = r[4].success ? BigInt(r[4].returnData) : 0n;
    rows.push({ vault: vaults[i], name, asset, totalAssets: ta.toString(), evcOk: !!(evc && evc.toLowerCase() === EVC.toLowerCase()), isProxy });
  }

  const assets = [
    ...new Set(rows.map((r) => r.asset.toLowerCase()).filter((a) => a && a !== '0x0000000000000000000000000000000000000000')),
  ];
  const meta = {};
  const metaCalls = [];
  for (const a of assets) {
    metaCalls.push(call(a, ERC20_ABI, 'symbol'));
    metaCalls.push(call(a, ERC20_ABI, 'decimals'));
  }
  const metaRes = await batch(metaCalls);
  assets.forEach((a, i) => {
    const sym = metaRes[i * 2];
    const dec = metaRes[i * 2 + 1];
    let symbol = '';
    let decimals = 0;
    try {
      if (sym.success) symbol = decodeFunctionResult({ abi: ERC20_ABI, functionName: 'symbol', data: sym.returnData });
      if (dec.success) decimals = Number(decodeFunctionResult({ abi: ERC20_ABI, functionName: 'decimals', data: dec.returnData }));
    } catch { /* ignore */ }
    meta[a] = { symbol, decimals };
  });

  const ranked = rows
    .map((r) => {
      const m = meta[r.asset.toLowerCase()];
      const dec = m ? m.decimals : 0;
      return { ...r, symbol: m ? m.symbol : '', tvlHuman: dec ? Number(r.totalAssets) / 10 ** dec : 0 };
    })
    .sort((a, b) => b.tvlHuman - a.tvlHuman);

  for (const r of ranked.slice(0, 15)) {
    console.log(
      `${r.vault}  tvl=${r.tvlHuman.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${r.symbol}  isProxy=${r.isProxy} evcOk=${r.evcOk}  name="${r.name}"`
    );
  }
  const allProxy = ranked.every((r) => r.isProxy);
  const anyBadEvc = ranked.some((r) => !r.evcOk);
  console.log(`\nall isProxy=${allProxy}; any EVC mismatch=${anyBadEvc}`);
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
