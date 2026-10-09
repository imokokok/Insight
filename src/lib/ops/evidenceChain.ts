/**
 * @fileoverview Evidence-chain view data (read-only) for the /ops console.
 *
 * The pre-trade pipeline signs a verdict ("this price is safe to act on now")
 * and the execution pipeline signs what the agent actually did. Both halves are
 * already persisted — `pre_trade_checks.attestation_uid` and
 * `execution_receipts.pre_trade_uid` are the pairing anchor — but until this
 * module nothing read them together, so the console could not answer the
 * questions a counterparty actually asks:
 *
 *   - this agent claims it filled faithfully: WHICH pre-trade check authorised
 *     it, and what did that check say?
 *   - which executions drifted (DEVIATED) or breached their slippage bound?
 *   - which receipts have no pre-trade anchor to pair with at all?
 *   - which executions went ahead anyway, against a BLOCK/CAUTION verdict?
 *
 * Everything here is a read on the service-role client for the internal console;
 * it adds no write path and no public surface.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';

import { pagedSelect } from './opsQueries';

export type ExecutionStatus = 'FAITHFUL' | 'DEVIATED' | 'NOT_EXECUTED' | 'UNDETERMINED';

interface ExecutionReceiptRow {
  id: string;
  created_at: string;
  uid: string | null;
  attested: boolean;
  source: string;
  environment: string | null;
  action: string | null;
  execution_status: string;
  fill_status: string;
  slippage_satisfied: boolean | null;
  price_delta_bps: number | null;
  max_slippage_bps: number | null;
  subject_chain_id: number | null;
  settlement_chain_id: number | null;
  source_asset_id: string;
  destination_asset_id: string;
  tx_hash: string;
  executed_at: string | null;
  pre_trade_uid: string | null;
}

interface PreTradeAnchorRow {
  id: string;
  attestation_uid: string;
  verdict: string | null;
  asset: string;
  chain_id: number;
  coverage_status: string | null;
  signed: boolean | null;
  created_at: string;
}

export interface EvidenceChainRow {
  id: string;
  receiptUid: string | null;
  attested: boolean;
  createdAt: string;
  executedAt: string | null;
  source: string;
  environment: string | null;
  action: string | null;
  executionStatus: string;
  fillStatus: string;
  slippageSatisfied: boolean | null;
  priceDeltaBps: number | null;
  maxSlippageBps: number | null;
  subjectChainId: number | null;
  settlementChainId: number | null;
  sourceAssetId: string;
  destinationAssetId: string;
  txHash: string;
  preTradeUid: string | null;
  pairedCheckId: string | null;
  pairedVerdict: string | null;
  pairedAsset: string | null;
  pairedChainId: number | null;
  pairedCoverageStatus: string | null;
  pairedSigned: boolean | null;
  pairedCreatedAt: string | null;
}

export interface EvidenceChainSummary {
  windowHours: number;
  receipts: number;
  paired: number;
  unpaired: number;
  faithful: number;
  deviated: number;
  undetermined: number;
  notExecuted: number;
  /** Paired executions that ran even though the pre-trade verdict advised against trading. */
  executedAgainstWarning: number;
  /** Receipts whose signed slippage bound was not met. */
  slippageBreaches: number;
  /** True when the receipt query failed — nothing below is reliable. */
  errored?: boolean;
  /** True when the pre-trade anchor lookup failed — pairing is then incomplete. */
  pairingErrored?: boolean;
}

export interface EvidenceChain {
  summary: EvidenceChainSummary;
  /** Newest receipts with no pre-trade anchor to pair with. */
  unpaired: EvidenceChainRow[];
  /** Newest receipts that drifted from, or breached, their authorised execution. */
  deviations: EvidenceChainRow[];
  /** Newest receipts overall, paired or not. */
  recent: EvidenceChainRow[];
}

/** Pre-trade verdicts that told the caller NOT to proceed. */
const WARNING_VERDICTS = new Set(['CAUTION', 'DANGER', 'BLOCK']);

/** Longest `.in(...)` list per anchor request, to keep the PostgREST URL bounded. */
const ANCHOR_BATCH_SIZE = 100;

function emptyChain(windowHours: number, errored: boolean): EvidenceChain {
  return {
    summary: {
      windowHours,
      receipts: 0,
      paired: 0,
      unpaired: 0,
      faithful: 0,
      deviated: 0,
      undetermined: 0,
      notExecuted: 0,
      executedAgainstWarning: 0,
      slippageBreaches: 0,
      errored,
    },
    unpaired: [],
    deviations: [],
    recent: [],
  };
}

async function fetchAnchors(
  uids: string[]
): Promise<{ rows: PreTradeAnchorRow[]; errored: boolean }> {
  const rows: PreTradeAnchorRow[] = [];
  if (uids.length === 0) return { rows, errored: false };
  const supabase = createServiceRoleClient();
  for (let index = 0; index < uids.length; index += ANCHOR_BATCH_SIZE) {
    const batch = uids.slice(index, index + ANCHOR_BATCH_SIZE);
    const { data, error } = await supabase
      .from('pre_trade_checks')
      .select('id, attestation_uid, verdict, asset, chain_id, coverage_status, signed, created_at')
      .in('attestation_uid', batch);
    if (error) return { rows, errored: true };
    rows.push(...((data ?? []) as PreTradeAnchorRow[]));
  }
  return { rows, errored: false };
}

function isSlippageBreach(row: ExecutionReceiptRow): boolean {
  return row.slippage_satisfied === false;
}

/**
 * Build the evidence-chain view over a rolling window.
 *
 * Pairing is a soft join: `execution_receipts.pre_trade_uid` carries the
 * pre-trade attestation UID, and `pre_trade_checks.attestation_uid` is the
 * anchor. A receipt is "unpaired" when it carries no uid at all, or when no
 * pre-trade row claims that uid — which is exactly the case a counterparty
 * needs to see, since an unpaired execution cannot be justified after the fact.
 */
export async function getEvidenceChain(windowHours = 24, listLimit = 50): Promise<EvidenceChain> {
  const supabase = createServiceRoleClient();
  const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

  const { data, error } = await pagedSelect<ExecutionReceiptRow>((from, to) =>
    supabase
      .from('execution_receipts')
      .select(
        'id, created_at, uid, attested, source, environment, action, execution_status, fill_status, slippage_satisfied, price_delta_bps, max_slippage_bps, subject_chain_id, settlement_chain_id, source_asset_id, destination_asset_id, tx_hash, executed_at, pre_trade_uid'
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  if (error || !data) return emptyChain(windowHours, true);

  const receipts = data;
  const uids = [
    ...new Set(receipts.map((row) => row.pre_trade_uid).filter((uid): uid is string => !!uid)),
  ];
  const { rows: anchors, errored: pairingErrored } = await fetchAnchors(uids);
  const anchorByUid = new Map(anchors.map((anchor) => [anchor.attestation_uid, anchor]));

  const rows: EvidenceChainRow[] = receipts.map((row) => {
    const anchor = row.pre_trade_uid ? anchorByUid.get(row.pre_trade_uid) : undefined;
    return {
      id: String(row.id),
      receiptUid: row.uid,
      attested: row.attested === true,
      createdAt: row.created_at,
      executedAt: row.executed_at,
      source: row.source,
      environment: row.environment,
      action: row.action,
      executionStatus: row.execution_status,
      fillStatus: row.fill_status,
      slippageSatisfied: row.slippage_satisfied,
      priceDeltaBps: row.price_delta_bps,
      maxSlippageBps: row.max_slippage_bps,
      subjectChainId: row.subject_chain_id,
      settlementChainId: row.settlement_chain_id,
      sourceAssetId: row.source_asset_id,
      destinationAssetId: row.destination_asset_id,
      txHash: row.tx_hash,
      preTradeUid: row.pre_trade_uid,
      pairedCheckId: anchor?.id ?? null,
      pairedVerdict: anchor?.verdict ?? null,
      pairedAsset: anchor?.asset ?? null,
      pairedChainId: anchor?.chain_id ?? null,
      pairedCoverageStatus: anchor?.coverage_status ?? null,
      pairedSigned: anchor?.signed ?? null,
      pairedCreatedAt: anchor?.created_at ?? null,
    };
  });

  const summary: EvidenceChainSummary = {
    windowHours,
    receipts: receipts.length,
    paired: rows.filter((row) => row.pairedCheckId !== null).length,
    unpaired: rows.filter((row) => row.pairedCheckId === null).length,
    faithful: rows.filter((row) => row.executionStatus === 'FAITHFUL').length,
    deviated: rows.filter((row) => row.executionStatus === 'DEVIATED').length,
    undetermined: rows.filter((row) => row.executionStatus === 'UNDETERMINED').length,
    notExecuted: rows.filter((row) => row.executionStatus === 'NOT_EXECUTED').length,
    executedAgainstWarning: rows.filter(
      (row) =>
        row.pairedVerdict !== null &&
        WARNING_VERDICTS.has(row.pairedVerdict) &&
        row.executionStatus !== 'NOT_EXECUTED'
    ).length,
    slippageBreaches: receipts.filter(isSlippageBreach).length,
    ...(pairingErrored ? { pairingErrored: true } : {}),
  };

  const deviations = rows
    .filter(
      (row) =>
        row.executionStatus === 'DEVIATED' ||
        row.executionStatus === 'UNDETERMINED' ||
        row.slippageSatisfied === false
    )
    .slice(0, listLimit);

  return {
    summary,
    unpaired: rows.filter((row) => row.pairedCheckId === null).slice(0, listLimit),
    deviations,
    recent: rows.slice(0, listLimit),
  };
}
