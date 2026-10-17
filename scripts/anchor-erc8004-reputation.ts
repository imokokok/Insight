/* eslint-disable no-console */
/**
 * ERC-8004 reputation anchor batch (M2).
 *
 * Consumes the opt-in reputation_anchor_queue and writes one ERC-8004
 * feedback entry per row to the Reputation Registry on BNB Chain mainnet
 * (0x8004BAa17C55a88189AE136b182e5fdA19dE9b63, the deployment bound to the
 * Identity Registry at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432).
 *
 * Semantics (see src/lib/erc8004/reputationAnchor.ts):
 *   - value 100 / valueDecimals 0 = "x402-paid decision-input check completed
 *     with a signed attestation" — the score never judges the trade outcome.
 *   - tag1 'oracle-safety-check', tag2 = verdict tag (pass/warn/block/unknown).
 *   - feedbackHash = keccak256(attestation UID string): binds the evidence
 *     without disclosing it. feedbackURI points at the static evidence spec.
 *   - Every row is gated on-chain first: ownerOf(agentId) must equal the
 *     payer, and the submitter must not own the reviewed agentId (the
 *     registry would revert anyway; we pre-check to keep the queue clean).
 *
 * Keys: ERC8004_REGISTRAR_PRIVATE_KEY (owner of Insight's agentId 375779).
 * It signs the feedback transactions and pays BNB gas; it must never be the
 * owner of a reviewed agentId. Requires SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY. Optional ALCHEMY_BNB_RPC for a stable RPC.
 *
 * Modes:
 *   --check     Read-only: registrar, gas balance, queue status counts, batch preview.
 *   --dry-run   Full loop without sending transactions.
 *   --limit N   Max rows per run (default 25; one feedback tx costs fractions
 *               of a cent on BNB, so the daily cap bounds gas spend).
 *
 * Run:  npx tsx scripts/anchor-erc8004-reputation.ts --check
 *       npx tsx scripts/anchor-erc8004-reputation.ts --dry-run --limit 5
 *       npx tsx scripts/anchor-erc8004-reputation.ts
 */
import './loadEnv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  keccak256,
  toHex,
  type Address,
  type PublicClient,
} from 'viem';
import { bsc } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const IDENTITY_REGISTRY: Address = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REPUTATION_REGISTRY: Address = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
/** Insight's own ERC-8004 identity — never a reviewed subject. */
const INSIGHT_AGENT_ID = 375779n;
const FEEDBACK_URI = 'https://www.oracleinsight.xyz/erc8004/v1/insight-evidence.v1.json';
const TAG1 = 'oracle-safety-check';
const VALUE = 100n;
const VALUE_DECIMALS = 0;
const MAX_ATTEMPTS = 3;

const IDENTITY_ABI = [
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

const REPUTATION_ABI = [
  {
    type: 'function',
    name: 'giveFeedback',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'agentId', type: 'uint256' },
      { name: 'value', type: 'int128' },
      { name: 'valueDecimals', type: 'uint8' },
      { name: 'tag1', type: 'string' },
      { name: 'tag2', type: 'string' },
      { name: 'endpoint', type: 'string' },
      { name: 'feedbackURI', type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const;

interface QueueRow {
  id: string;
  request_id: string;
  payer: string;
  agent_id: number;
  verdict: string | null;
  attestation_uid: string | null;
  status: string;
  attempts: number;
}

function parseArgs(argv: string[]) {
  const args: { check: boolean; dryRun: boolean; limit: number } = {
    check: false,
    dryRun: false,
    limit: 25,
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--check') args.check = true;
    else if (argv[i] === '--dry-run') args.dryRun = true;
    else if (argv[i] === '--limit' && argv[i + 1]) args.limit = Math.max(1, Number(argv[++i]));
  }
  return args;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') throw new Error(`Missing required env ${key}`);
  return value.trim();
}

function openSupabase(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}

async function fetchPending(supabase: SupabaseClient, limit: number): Promise<QueueRow[]> {
  const { data, error } = await supabase
    .from('reputation_anchor_queue')
    .select('id, request_id, payer, agent_id, verdict, attestation_uid, status, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw new Error(`queue fetch failed: ${error.message}`);
  return (data ?? []) as QueueRow[];
}

async function updateRow(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<
    Pick<QueueRow, 'status' | 'attempts'> & {
      anchor_tx_hash: string | null;
      last_error: string | null;
    }
  >
): Promise<void> {
  const { error } = await supabase
    .from('reputation_anchor_queue')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error(`[anchor] row ${id} update failed: ${error.message}`);
}

/** keccak256 of the attestation UID string — binds evidence without disclosing it. */
function feedbackHash(attestationUid: string | null): `0x${string}` {
  if (!attestationUid) {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }
  return keccak256(toHex(attestationUid));
}

function verdictTag(verdict: string | null): string {
  const normalized = (verdict ?? 'unknown').trim().toLowerCase();
  return ['pass', 'warn', 'block'].includes(normalized) ? normalized : 'unknown';
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const rpcUrl = process.env.ALCHEMY_BNB_RPC?.trim() || 'https://bsc-dataseed.binance.org';
  const publicClient: PublicClient = createPublicClient({ chain: bsc, transport: http(rpcUrl) });
  const supabase = openSupabase();

  const registrarKey = requireEnv('ERC8004_REGISTRAR_PRIVATE_KEY');
  const account = privateKeyToAccount(
    (registrarKey.startsWith('0x') ? registrarKey : `0x${registrarKey}`) as `0x${string}`
  );

  console.log(
    `\nERC-8004 reputation anchor · BNB mainnet (chain 56)\n` +
      `reputation  ${REPUTATION_REGISTRY}\n` +
      `identity    ${IDENTITY_REGISTRY}\n` +
      `submitter   ${account.address}\n` +
      `mode        ${args.check ? 'check' : args.dryRun ? 'dry-run' : 'write'} · limit ${args.limit}\n`
  );

  if (args.check) {
    const [gasBalance, pending] = await Promise.all([
      publicClient.getBalance({ address: account.address }),
      fetchPending(supabase, 1000),
    ]);
    const byStatus = await supabase
      .from('reputation_anchor_queue')
      .select('status', { count: 'exact', head: true })
      .eq('status', 'pending');
    console.log(`gas balance ${formatEther(gasBalance)} BNB`);
    console.log(`pending rows: ${pending.length} (count query: ${byStatus.count ?? 'n/a'})`);
    for (const row of pending.slice(0, 5)) {
      console.log(
        `  preview agentId=${row.agent_id} verdict=${row.verdict ?? 'unknown'} payer=${row.payer}`
      );
    }
    return;
  }

  const wallet = createWalletClient({ account, chain: bsc, transport: http(rpcUrl) });
  const rows = await fetchPending(supabase, args.limit);
  if (rows.length === 0) {
    console.log('[anchor] queue empty — nothing to anchor');
    return;
  }

  let anchored = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    const tag2 = verdictTag(row.verdict);
    try {
      const agentId = BigInt(row.agent_id);
      if (agentId === INSIGHT_AGENT_ID) {
        await updateRow(supabase, row.id, {
          status: 'skipped',
          last_error: 'insight_agent_id_not_reviewable',
        });
        skipped += 1;
        continue;
      }

      // On-chain ownership gate: the reviewed identity must belong to the payer.
      let owner: Address;
      try {
        owner = await publicClient.readContract({
          address: IDENTITY_REGISTRY,
          abi: IDENTITY_ABI,
          functionName: 'ownerOf',
          args: [agentId],
        });
      } catch {
        await updateRow(supabase, row.id, {
          status: 'skipped',
          last_error: 'agent_id_not_registered',
        });
        skipped += 1;
        continue;
      }
      if (owner.toLowerCase() !== row.payer.toLowerCase()) {
        await updateRow(supabase, row.id, {
          status: 'skipped',
          last_error: 'owner_mismatch',
        });
        skipped += 1;
        continue;
      }
      if (owner.toLowerCase() === account.address.toLowerCase()) {
        await updateRow(supabase, row.id, {
          status: 'skipped',
          last_error: 'submitter_owns_reviewed_agent',
        });
        skipped += 1;
        continue;
      }

      if (args.dryRun) {
        console.log(
          `[anchor] dry-run would anchor agentId=${row.agent_id} tag2=${tag2} hash=${feedbackHash(row.attestation_uid).slice(0, 10)}…`
        );
        anchored += 1;
        continue;
      }

      const hash = await wallet.writeContract({
        address: REPUTATION_REGISTRY,
        abi: REPUTATION_ABI,
        functionName: 'giveFeedback',
        args: [
          agentId,
          VALUE,
          VALUE_DECIMALS,
          TAG1,
          tag2,
          'https://www.oracleinsight.xyz/api/v1/safety/pre-trade',
          FEEDBACK_URI,
          feedbackHash(row.attestation_uid),
        ],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') {
        throw new Error(`anchor tx reverted: ${hash}`);
      }
      await updateRow(supabase, row.id, {
        status: 'anchored',
        anchor_tx_hash: hash,
      });
      anchored += 1;
      console.log(`[anchor] anchored agentId=${row.agent_id} tx=${hash}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const attempts = row.attempts + 1;
      await updateRow(supabase, row.id, {
        status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
        attempts,
        last_error: message.slice(0, 500),
      });
      failed += 1;
      console.error(`[anchor] agentId=${row.agent_id} attempt ${attempts} failed: ${message}`);
    }
  }

  console.log(
    `\n[anchor] done: ${anchored} anchored, ${skipped} skipped, ${failed} failed (of ${rows.length})`
  );
  if (failed > 0 && anchored === 0) process.exit(1);
}

main().catch((error) => {
  console.error('[anchor] unhandled error:', error);
  process.exit(1);
});
