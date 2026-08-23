/**
 * Live on-chain verification of the safety-check position importers.
 *
 * For each lending protocol we discover REAL position-holder addresses by
 * scanning recent `Borrow`/`Supply` events (via the project's own rpcClient,
 * which uses Alchemy + public fallbacks just like production), then run the
 * actual `importPosition` importer against those addresses and check the
 * returned collaterals/borrows are non-empty and sane.
 *
 * Discovery returns several candidate holders (most-recent first); we import
 * each until one yields a non-empty position, so a single closed position does
 * not produce a false EMPTY. A contract revert (position-less wallet) is
 * handled gracefully by the importers and must NOT poison the shared RPC pool
 * (fixed in rpcClientWithFallback).
 *
 * Run: npx tsx scripts/verify-importers.ts [targetId ...]
 *   (optional args filter which targets run, e.g. `compound-v3-ethereum`)
 */
import './loadEnv';

import { getAddress, keccak256, toHex } from 'viem';

import { importPosition } from '@/lib/protocols/importer';
import { getProtocolById } from '@/lib/protocols/protocolRegistry';
import { getLogs, getBlockNumber, readContract } from '@/lib/protocols/importer/rpcClient';

import type { ProtocolConfig } from '@/lib/protocols/protocolRegistry';

interface LogRpc {
  address: string;
  topics: string[];
  data: string;
}

// Decode an `address[]` ABI return (dynamic array) from eth_call hex output.
function decodeAddressArray(hex: string): string[] {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  const words = h.match(/.{1,64}/g) ?? [];
  if (words.length < 2) return [];
  const n = Number(BigInt(`0x${words[1]}`));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const w = words[2 + i];
    if (!w) break;
    out.push(getAddress(`0x${w.slice(-40)}`));
  }
  return out;
}

function eventSig(name: string): `0x${string}` {
  return keccak256(toHex(name));
}

function addressFromTopic(topic: string | undefined): `0x${string}` | undefined {
  if (!topic) return undefined;
  const hex = topic.startsWith('0x') ? topic.slice(2) : topic;
  try {
    return getAddress(`0x${hex.slice(-40)}`);
  } catch {
    return undefined;
  }
}

function addressFromData(data: string): `0x${string}` | undefined {
  const hex = data.startsWith('0x') ? data.slice(2) : data;
  const word0 = hex.slice(0, 64);
  if (word0.length < 40) return undefined;
  try {
    return getAddress(`0x${word0.slice(-40)}`);
  } catch {
    return undefined;
  }
}

function isLimitError(msg: string): boolean {
  return /exceeds|too large|more than|limit|request.*too long|range|cap|unsupported/i.test(msg);
}

async function scanEventCandidates(
  chainId: number,
  address: `0x${string}`,
  eventSignature: `0x${string}`,
  source: 'topic' | 'data',
  topicIndex: number,
  initialWindow: bigint,
  maxCandidates: number
): Promise<`0x${string}`[]> {
  const latest = await getBlockNumber(chainId);
  const found: `0x${string}`[] = [];
  let window = initialWindow;
  for (let sizeTry = 0; sizeTry < 6 && found.length < maxCandidates; sizeTry++) {
    for (let back = 0n; back < 8n && found.length < maxCandidates; back++) {
      const to = latest - back * window;
      const from = to - window + 1n;
      let logs: LogRpc[];
      try {
        logs = (await getLogs(chainId, {
          address,
          fromBlock: from,
          toBlock: to,
          topics: [eventSignature],
        })) as LogRpc[];
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (isLimitError(msg)) {
          window = window / 2n;
          break;
        }
        throw err;
      }
      for (const log of logs) {
        const addr =
          source === 'data' ? addressFromData(log.data) : addressFromTopic(log.topics[topicIndex]);
        if (addr && !found.includes(addr)) {
          found.push(addr);
          if (found.length >= maxCandidates) break;
        }
      }
    }
    if (window < 500n) break;
  }
  return found;
}

const BORROW_V2 = eventSig('Borrow(address,uint256,uint256,uint256)');
const GET_ALL_MARKETS = '0xb0772d0b' as `0x${string}`;

async function findComptrollerCandidates(
  chainId: number,
  comptroller: `0x${string}`,
  window: bigint,
  maxCandidates: number
): Promise<`0x${string}`[]> {
  const raw = await readContract(chainId, getAddress(comptroller), GET_ALL_MARKETS);
  const cTokens = decodeAddressArray(raw);
  if (cTokens.length === 0) throw new Error('no markets');
  const latest = await getBlockNumber(chainId);
  const found: `0x${string}`[] = [];
  for (const cToken of cTokens.slice(0, 8)) {
    let scan = window;
    for (let sizeTry = 0; sizeTry < 6 && found.length < maxCandidates; sizeTry++) {
      for (let back = 0n; back < 6n && found.length < maxCandidates; back++) {
        const to = latest - back * scan;
        const from = to - scan + 1n;
        let logs: LogRpc[];
        try {
          logs = (await getLogs(chainId, {
            address: cToken,
            fromBlock: from,
            toBlock: to,
            topics: [BORROW_V2],
          })) as LogRpc[];
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (isLimitError(msg)) {
            scan = scan / 2n;
            break;
          }
          throw err;
        }
        for (const log of logs) {
          const addr = addressFromTopic(log.topics[1]);
          if (addr && !found.includes(addr)) {
            found.push(addr);
            if (found.length >= maxCandidates) break;
          }
        }
      }
      if (scan < 500n) break;
    }
  }
  return found;
}

interface Target {
  id: string;
  discover: (p: ProtocolConfig) => Promise<`0x${string}`[]>;
}

const TARGETS: Target[] = [
  {
    id: 'aave-v3-ethereum',
    discover: (p) =>
      scanEventCandidates(
        1,
        p.contracts!.pool!,
        eventSig('Borrow(address,address,address,uint256,uint8,uint256,uint16)'),
        'data',
        0,
        2_000n,
        5
      ),
  },
  {
    id: 'compound-v3-ethereum',
    discover: (p) =>
      scanEventCandidates(
        1,
        p.contracts!.comet!,
        eventSig('Supply(address,address,uint256)'),
        'topic',
        2, // onBehalf is the position holder, NOT `from` (topics[1])
        8_000n,
        3
      ),
  },
  {
    id: 'compound-v3-base',
    discover: (p) =>
      scanEventCandidates(
        8453,
        p.contracts!.comet!,
        eventSig('Supply(address,address,uint256)'),
        'topic',
        2, // onBehalf is the position holder, NOT `from` (topics[1])
        8_000n,
        3
      ),
  },
  {
    id: 'morpho-blue-ethereum',
    discover: (p) =>
      scanEventCandidates(
        1,
        p.contracts!.morpho!,
        eventSig('Supply(bytes32,address,address,uint256,uint256)'),
        'topic',
        2, // owner is topics[2]
        2_000n,
        1 // Morpho import scans full market history per candidate; 1 is enough to prove the path
      ),
  },
  {
    id: 'morpho-blue-base',
    discover: (p) =>
      scanEventCandidates(
        8453,
        p.contracts!.morpho!,
        eventSig('Supply(bytes32,address,address,uint256,uint256)'),
        'topic',
        2, // owner is topics[2]
        2_000n,
        1 // Morpho import scans full market history per candidate; 1 is enough to prove the path
      ),
  },
  {
    id: 'venus-bnb-chain',
    discover: (p) => findComptrollerCandidates(56, p.contracts!.comptroller!, 5_000n, 4),
  },
  {
    id: 'benqi-avalanche',
    discover: (p) => findComptrollerCandidates(43114, p.contracts!.comptroller!, 2_000n, 4),
  },
];

const ALLOW = new Set(process.argv.slice(2));

async function main() {
  let pass = 0;
  let empty = 0;
  let fail = 0;
  let discoverFail = 0;

  for (const target of TARGETS) {
    if (ALLOW.size > 0 && !ALLOW.has(target.id)) continue;
    const protocol = getProtocolById(target.id);
    if (!protocol) {
      console.log(`SKIP  ${target.id}: not in registry`);
      continue;
    }

    let candidates: `0x${string}`[];
    try {
      candidates = await target.discover(protocol);
    } catch (err) {
      discoverFail++;
      console.log(
        `DISCOVER-FAIL ${target.id}: ${err instanceof Error ? err.message : String(err)}`
      );
      continue;
    }
    if (candidates.length === 0) {
      discoverFail++;
      console.log(`DISCOVER-EMPTY ${target.id}: no candidate events found in range`);
      continue;
    }

    // Try each candidate; a closed position imports empty (continue), a revert
    // throws (record and continue), a live position yields PASS (stop).
    let outcome: 'PASS' | 'EMPTY' | 'FAIL' = 'EMPTY';
    let lastPos: Awaited<ReturnType<typeof importPosition>> | undefined;
    let lastAddr: `0x${string}` | undefined;
    let failMsgs: string[] = [];

    for (const addr of candidates) {
      try {
        const pos = await importPosition(protocol, addr);
        lastPos = pos;
        lastAddr = addr;
        const hasPos = pos.collaterals.length > 0 || pos.borrows.length > 0;
        if (hasPos) {
          outcome = 'PASS';
          pass++;
          console.log(
            `PASS  ${target.id}  addr=${addr.slice(0, 10)}…  coll=${pos.collaterals.length} borr=${pos.borrows.length} skip=${pos.skippedAssets.length}`
          );
          if (pos.collaterals.length)
            console.log(
              '   collaterals:',
              pos.collaterals.map((c) => `${c.symbol}=${c.amount}`).join(', ')
            );
          if (pos.borrows.length)
            console.log(
              '   borrows:    ',
              pos.borrows.map((b) => `${b.symbol}=${b.amount}`).join(', ')
            );
          if (pos.skippedAssets.length)
            console.log(
              '   skipped:    ',
              pos.skippedAssets.map((s) => `${s.symbol}:${s.reason}`).join(', ')
            );
          break;
        }
        // empty for this candidate, keep looking
      } catch (err) {
        fail++;
        const msg = err instanceof Error ? err.message : String(err);
        failMsgs.push(`${addr.slice(0, 10)}…: ${msg}`);
        lastAddr = addr;
      }
    }

    if (outcome === 'PASS') continue;

    if (failMsgs.length === candidates.length) {
      // every candidate import threw
      fail++;
      console.log(`IMPORT-FAIL ${target.id}: ${failMsgs.join(' | ')}`);
    } else {
      empty++;
      const shown = lastPos
        ? `coll=${lastPos.collaterals.length} borr=${lastPos.borrows.length} skip=${lastPos.skippedAssets.length}`
        : '';
      console.log(
        `EMPTY ${target.id}  addr=${lastAddr ? lastAddr.slice(0, 10) + '…' : '<none>'}  ${shown}  (${candidates.length} candidates tried)`
      );
    }
  }

  console.log(
    `\n=== SUMMARY: pass=${pass} empty=${empty} fail=${fail} discoverFail=${discoverFail} ===`
  );
  if (fail > 0 || discoverFail > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('FATAL', err);
  process.exit(1);
});
