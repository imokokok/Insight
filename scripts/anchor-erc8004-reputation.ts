/* eslint-disable no-console */
/**
 * ERC-8004 reputation anchor batch (M2).
 *
 * Consumes the opt-in reputation_anchor_queue and writes one ERC-8004
 * feedback entry per row to the canonical Reputation Registry
 * (0x8004BAa17C55a88189AE136b182e5fdA19dE9b63, the deployment bound to the
 * Identity Registry at 0x8004A169FB4a3325136EB29fA0ceB6D2e539a432). Routing
 * is by settlement network: rows paid on eip155:143 anchor on Monad mainnet,
 * all other rows anchor on BNB Chain mainnet — same registry addresses,
 * chain-local ownership verification.
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
 * Keys: ERC8004_REGISTRAR_PRIVATE_KEY (owner of Insight's agentId 375779 on
 * BNB Chain and 10414 on Monad). It signs the feedback transactions and pays
 * gas on both chains; it must never be the owner of a reviewed agentId.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY. Optional ALCHEMY_BNB_RPC
 * and MONAD_RPC_URL override the default public RPCs.
 *
 * Validation responder pass (opt-in): when ERC8004_VALIDATION_REGISTRY is set
 * to a deployed Validation Registry address, the batch also polls requests
 * addressed to the registrar wallet (Insight as validator) and answers each
 * unanswered one with response=100 + the static evidence spec URI. No
 * canonical Validation Registry deployment exists on any chain as of
 * 2026-10-21; leave the variable unset to skip the pass (see
 * src/lib/erc8004/validationRegistry.ts).
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
import { readFileSync } from 'node:fs';
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
import { bsc, monad } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  buildValidationResponseHash,
  selectPendingValidations,
  validationRegistryAddress,
  VALIDATION_REGISTRY_ABI,
  VALIDATION_RESPONSE_COMPLETED,
  VALIDATION_RESPONSE_URI,
  VALIDATION_TAG,
} from '@/lib/erc8004/validationRegistry';

const IDENTITY_REGISTRY: Address = '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432';
const REPUTATION_REGISTRY: Address = '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63';
/**
 * Canonical ERC-8004 registries are deployed at identical addresses on every
 * supported chain, so anchoring routes purely by chain. Since 2026-10-19 the
 * batch anchors on the chain the payment settled on: x402 v2 networks are
 * CAIP-2 ids and `eip155:143` rows anchor on Monad mainnet. Anything else
 * (null, unknown network, other EVM ids) keeps anchoring on BNB Chain.
 */
const ANCHOR_CHAINS = {
  bsc: {
    chain: bsc,
    chainId: 56,
    label: 'BNB mainnet',
    defaultRpc: 'https://bsc-dataseed.binance.org',
    rpcEnv: 'ALCHEMY_BNB_RPC',
    gasSymbol: 'BNB',
  },
  monad: {
    chain: monad,
    chainId: 143,
    label: 'Monad mainnet',
    defaultRpc: 'https://rpc.monad.xyz',
    rpcEnv: 'MONAD_RPC_URL',
    gasSymbol: 'MON',
  },
} as const;
type AnchorChainKey = keyof typeof ANCHOR_CHAINS;
/** Insight's own identities per chain — never a reviewed subject, on any chain. */
const INSIGHT_AGENT_IDS = new Set([375779n, 10414n]);
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
  payment_network: string | null;
  status: string;
  attempts: number;
}

/** Route a queue row to the registry chain its payment settled on. */
function resolveAnchorChainKey(paymentNetwork: string | null): AnchorChainKey {
  return paymentNetwork === 'eip155:143' ? 'monad' : 'bsc';
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
    .select(
      'id, request_id, payer, agent_id, verdict, attestation_uid, payment_network, status, attempts'
    )
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

/** keccak256 of the checked-in evidence spec — integrity hash for responseURI. */
function evidenceResponseHash(): `0x${string}` {
  const evidence = readFileSync('public/erc8004/v1/insight-evidence.v1.json', 'utf8');
  return buildValidationResponseHash(evidence);
}

interface ValidationPassClients {
  publicClient: PublicClient;
  wallet: ReturnType<typeof createWalletClient>;
  label: string;
}

/**
 * Validation responder pass (pull model): agents address validationRequest at
 * the registrar wallet; we answer every unanswered one with response=100 and
 * the static evidence spec. Idempotent — answered requests are skipped, so
 * the daily batch can simply re-run. No-ops entirely while
 * ERC8004_VALIDATION_REGISTRY is unset (no canonical deployment yet).
 */
async function respondToValidations(
  clients: Map<AnchorChainKey, ValidationPassClients>,
  accountAddress: Address,
  registry: `0x${string}` | null,
  dryRun: boolean
): Promise<void> {
  if (!registry) {
    console.log(
      '[validate] ERC8004_VALIDATION_REGISTRY unset — no canonical Validation Registry deployment yet, responder skipped'
    );
    return;
  }
  const responseHash = evidenceResponseHash();
  let answered = 0;
  let failed = 0;

  for (const key of Object.keys(ANCHOR_CHAINS) as AnchorChainKey[]) {
    const { publicClient, wallet, label } = clients.get(key)!;
    let requestHashes: ReadonlyArray<`0x${string}`>;
    try {
      requestHashes = await publicClient.readContract({
        address: registry,
        abi: VALIDATION_REGISTRY_ABI,
        functionName: 'getValidatorRequests',
        args: [accountAddress],
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[validate] ${label}: getValidatorRequests failed: ${message.slice(0, 200)}`);
      failed += 1;
      continue;
    }
    if (requestHashes.length === 0) continue;

    const statuses = [];
    for (const requestHash of requestHashes) {
      try {
        const status = await publicClient.readContract({
          address: registry,
          abi: VALIDATION_REGISTRY_ABI,
          functionName: 'getValidationStatus',
          args: [requestHash],
        });
        statuses.push({ requestHash, response: Number(status.response) });
      } catch (error) {
        statuses.push({
          requestHash,
          response: 0,
          readError: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const selection = selectPendingValidations(statuses);
    console.log(
      `[validate] ${label}: ${requestHashes.length} request(s) · ${selection.alreadyAnswered} answered · ${selection.unreadable} unreadable · ${selection.pending.length} to answer`
    );

    for (const requestHash of selection.pending) {
      if (dryRun) {
        console.log(`[validate] dry-run would respond requestHash=${requestHash}`);
        answered += 1;
        continue;
      }
      try {
        const hash = await wallet.writeContract({
          address: registry,
          abi: VALIDATION_REGISTRY_ABI,
          functionName: 'validationResponse',
          args: [
            requestHash,
            VALIDATION_RESPONSE_COMPLETED,
            VALIDATION_RESPONSE_URI,
            responseHash,
            VALIDATION_TAG,
          ],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error(`validation response tx reverted: ${hash}`);
        }
        answered += 1;
        console.log(`[validate] ${label}: responded requestHash=${requestHash} tx=${hash}`);
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[validate] ${label}: response failed: ${message.slice(0, 200)}`);
      }
    }
  }

  console.log(`[validate] done: ${answered} answered, ${failed} failed`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const supabase = openSupabase();

  const registrarKey = requireEnv('ERC8004_REGISTRAR_PRIVATE_KEY');
  const account = privateKeyToAccount(
    (registrarKey.startsWith('0x') ? registrarKey : `0x${registrarKey}`) as `0x${string}`
  );

  const validationRegistry = validationRegistryAddress(process.env);

  const clients = new Map<
    AnchorChainKey,
    ValidationPassClients & { gasSymbol: string; chainId: number }
  >();
  for (const key of Object.keys(ANCHOR_CHAINS) as AnchorChainKey[]) {
    const cfg = ANCHOR_CHAINS[key];
    const rpcUrl = process.env[cfg.rpcEnv]?.trim() || cfg.defaultRpc;
    clients.set(key, {
      publicClient: createPublicClient({ chain: cfg.chain, transport: http(rpcUrl) }),
      wallet: createWalletClient({ account, chain: cfg.chain, transport: http(rpcUrl) }),
      gasSymbol: cfg.gasSymbol,
      chainId: cfg.chainId,
      label: cfg.label,
    });
  }

  console.log(
    `\nERC-8004 reputation anchor · routed by settlement network\n` +
      `reputation  ${REPUTATION_REGISTRY} (same address on both chains)\n` +
      `identity    ${IDENTITY_REGISTRY}\n` +
      `validation  ${validationRegistry ?? '(not configured — responder disabled)'}\n` +
      `submitter   ${account.address}\n` +
      `routing     eip155:143 → Monad mainnet (chain 143) · everything else → BNB mainnet (chain 56)\n` +
      `mode        ${args.check ? 'check' : args.dryRun ? 'dry-run' : 'write'} · limit ${args.limit}\n`
  );

  if (args.check) {
    const pending = await fetchPending(supabase, 1000);
    for (const key of Object.keys(ANCHOR_CHAINS) as AnchorChainKey[]) {
      const client = clients.get(key)!;
      const gasBalance = await client.publicClient.getBalance({ address: account.address });
      const routed = pending.filter((row) => resolveAnchorChainKey(row.payment_network) === key);
      console.log(
        `${ANCHOR_CHAINS[key].label}: gas ${formatEther(gasBalance)} ${client.gasSymbol} · pending ${routed.length}`
      );
      for (const row of routed.slice(0, 3)) {
        console.log(
          `  preview agentId=${row.agent_id} verdict=${row.verdict ?? 'unknown'} payer=${row.payer} network=${row.payment_network ?? '(null → BNB)'}`
        );
      }
    }
    await respondToValidations(clients, account.address, validationRegistry, true);
    return;
  }

  await respondToValidations(clients, account.address, validationRegistry, args.dryRun);

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
    const chainKey = resolveAnchorChainKey(row.payment_network);
    const { publicClient, wallet } = clients.get(chainKey)!;
    try {
      const agentId = BigInt(row.agent_id);
      if (INSIGHT_AGENT_IDS.has(agentId)) {
        await updateRow(supabase, row.id, {
          status: 'skipped',
          last_error: 'insight_agent_id_not_reviewable',
        });
        skipped += 1;
        continue;
      }

      // On-chain ownership gate on the routed chain: the reviewed identity
      // must belong to the payer there.
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
          `[anchor] dry-run would anchor agentId=${row.agent_id} tag2=${tag2} chain=${ANCHOR_CHAINS[chainKey].label} hash=${feedbackHash(row.attestation_uid).slice(0, 10)}…`
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
