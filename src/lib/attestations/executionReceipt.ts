/**
 * @fileoverview Execution Receipt — a signed, independently verifiable record
 * of "the agent actually executed at the price Insight said was trustworthy".
 *
 * Closes the one gap the existing receipt family leaves open. Pre-trade answers
 * "is this price trustworthy to act on right now?" and signs that answer.
 * Oracle Watch answers "can I keep depending on this feed?" Neither says
 * anything about what the agent DID after being told the price was safe, so a
 * principal holding both receipts still cannot tell a faithful fill from a
 * drifted one. This module signs that third fact.
 *
 * It is an ADDITIVE receipt type, not a change to the frozen pre-trade line:
 * v1 (11 fields), v2 (26) and v3 (27) are untouched and stay verifiable. The
 * pairing is by reference, not by mutation: `preTradeUid` binds the pre-trade
 * attestation this execution belongs to, and `requestHash` is the SAME canonical
 * request commitment pre-trade signs, so a holder can prove the two receipts
 * describe the same action without trusting either issuer further.
 *
 * Design rules inherited from the existing line, each paid for by a partner
 * finding — they are not stylistic:
 *
 *   - Thresholds that gate a verdict are SIGNED alongside the value they are
 *     compared against, so a receipt is self-contained. `maxSlippageBps` sits
 *     next to `priceDeltaBps`; `requiredSourceGroupCount` sits next to
 *     `sourceGroupCount`. Without them a holder would need our source code to
 *     interpret a document we signed (VERITAS, 2026-08-29).
 *   - Derived verdict fields are computed INSIDE buildMessage so a receipt can
 *     never disagree with the evidence it carries.
 *   - A missing attester key means "attestations unavailable", never a different
 *     verdict. Signing is additive and must never become a safety dependency.
 *
 * Disclosure boundary (verification != endorsement): this receipt asserts only
 * that (a) the fill price landed within the signed slippage bound of the price
 * pre-trade certified, and (b) the oracle basis the agent was certified against
 * at pre-trade — provider count, distinct-operator-group count, and data age —
 * is carried forward into this receipt so a holder can judge whether that basis
 * was still sound at settlement. The basis counts are the agent's own pre-trade
 * gate values, presented by the caller and re-signed here; this receipt does NOT
 * independently re-prove oracle quorum or independence at execution time. It does
 * NOT assert the price was "correct", that the trade was well-timed, or that the
 * strategy was sound.
 *
 * Scale conventions match the rest of the family so one verifier handles all
 * receipt types: price -> 1e8, USD -> 1e6, percent -> 1e2 (bps), ratio -> 1e4.
 */

import { createLogger } from '@/lib/utils/logger';
import { nowInSeconds } from '@/lib/utils/time';

import { getAttesterAccount, getSampleAttesterAccount } from './attesterAccount';
import {
  computeMeasuredFieldsHash,
  computePreTradeUidsHash,
  type MeasurableExecutionField,
} from './executionCommitments';
import { computeReasonCodesHash } from './reasonCodesHash';

const logger = createLogger('ExecutionReceipt');

export const EXECUTION_SCHEMA_VERSION = 1;
/**
 * v2 adds two signed fields that close a real trust hole in v1.
 *
 * v1 signed the pre-trade binding fields (`preTradeUid`, `requestHash`,
 * `quotedPrice`, `participantCount`, `sourceGroupCount`) exactly as the caller
 * reported them. A signature over caller-supplied values proves only that
 * Insight signed those numbers — not that a matching pre-trade gate ever
 * existed. An agent could invent a permissive quote, a wide slippage bound and
 * a flattering provider count, and obtain a receipt that says FAITHFUL and
 * verifies cleanly on its own.
 *
 * v2 fixes that by signing HOW the binding was established:
 *   - `bindingMode` — VERIFIED when Insight verified the pre-trade attestation
 *     itself and took every binding field from the signature-checked payload;
 *     SELF_REPORTED when the caller asserted them and Insight merely re-signed
 *     the assertion.
 *   - `preTradeSignedAt` — the pre-trade signing time, so a holder can check
 *     the gate genuinely PRECEDED the execution instead of being fabricated
 *     after a favourable fill was already known.
 *
 * v1 receipts stay verifiable: the verify path routes on the signed
 * `schemaVersion` and re-derives the matching type layout.
 */
export const EXECUTION_SCHEMA_VERSION_V2 = 2;

/**
 * v3 closes eight findings from the VERITAS independent verification pass
 * (2026-09-02). Every one of them is the same shape: the receipt made a
 * statement whose scope, subject or basis lived outside the signature, so a
 * holder could not check it from the bytes alone. v3 moves each of those into a
 * signed field rather than into documentation.
 *
 *   F0  — the v1 type definition is now published alongside the struct, so the
 *         "field 11 of 30" claim is checkable rather than taken on trust.
 *   F1  — `destinationPreTradeUid` + `preTradeUidsHash`. quotedPrice is the
 *         ratio of TWO gates and the denominator is the entire volatile leg.
 *         v2 signed one uid and shipped the other out of band, so substituting a
 *         different destination gate left every signature valid. The hash
 *         additionally commits to the ORDERED set, so multi-leg routes are
 *         covered without another schema bump.
 *   F2  — `measuredFieldsHash`, and `executionStatus` is renamed
 *         `priceExecutionStatus`. A signed zero cannot be distinguished from
 *         "not measured", and the verdict only ever graded price. Both are now
 *         stated in the bytes: the hash says which notional fields were really
 *         measured, and the field name says what the verdict covers.
 *   F3  — `quoteVenueIndependent`. When the quote is derived from the venue the
 *         agent executes on, the pre-trade independence gate is describing a
 *         nominal provider set rather than the price actually used. That is now
 *         a signed boolean instead of a prose caveat.
 *   F4  — `quoteBasis` + `quoteBlockNumber`. Which mid the quote was taken
 *         against (prior block close, or the state immediately before the swap)
 *         changes the measured drift by ~0.6 bps on this pair and is material at
 *         a tight tolerance.
 *   F5  — `attestationAgeAtExecSeconds` + `priceStateAgeAtExecSeconds`. Two
 *         different clocks were both called "data age", which made a compliant
 *         receipt read as 2.5x past the gate's staleness bound.
 *   F6  — `subject`, `taker` and `claimRole`. Nothing signed named whose
 *         execution this was. Insight observes settlements; it does not execute
 *         them. An observer's statement about a third party's transaction and an
 *         executor's first-person claim are different speech acts, and the
 *         default role is the observer one because that is what this is.
 *   F7  — `priceScale` is declared in the struct (a fixed 1e8 was assumed, and
 *         an assumed scale is exactly the ambiguity that produced a 100x error
 *         in the verification pass), and the v3 domain carries `environment` so
 *         a staging receipt is structurally separable from a production one
 *         once a production key exists. (The domain half of F7 turned out
 *         inert — signers drop non-standard domain fields, Headless H7; v4
 *         signs `environment` as a message field, see below.)
 *
 * v1 and v2 receipts stay verifiable: the verify path routes on the signed
 * `schemaVersion` and re-derives the matching type layout AND domain.
 */
export const EXECUTION_SCHEMA_VERSION_V3 = 3;

/**
 * v4 (2026-09-02, Headless recheck H7) fixes where `environment` lives.
 *
 * v3's F7 change declared `environment` on the EIP-712 DOMAIN. That never
 * entered the signature: EIP-712 domain separators are limited to the five
 * standard fields (name, version, chainId, verifyingContract, salt), and every
 * conforming signer drops unknown domain keys before hashing. A byte-level
 * recheck of the v3 repair package recovered the signer only when
 * `environment` was OMITTED from the domain — the staging-vs-production
 * separation v3 promised was documentation, not cryptography.
 *
 * v4 moves `environment` into the signed message as the 44th field. The domain
 * is the same frozen three-field {@link EXECUTION_DOMAIN} for every version
 * (v1..v4), because that is the domain v1..v3 actually signed over. v3 stays
 * frozen and verifiable; the registry describes it with the three-field domain
 * its bytes really commit to.
 */
export const EXECUTION_SCHEMA_VERSION_V4 = 4;
/** Schema version new receipts are signed with. */
export const CURRENT_EXECUTION_SCHEMA_VERSION = EXECUTION_SCHEMA_VERSION_V4;
/** Every schema version this module can verify. */
export const SUPPORTED_EXECUTION_SCHEMA_VERSIONS = [
  EXECUTION_SCHEMA_VERSION,
  EXECUTION_SCHEMA_VERSION_V2,
  EXECUTION_SCHEMA_VERSION_V3,
  EXECUTION_SCHEMA_VERSION_V4,
] as const;

/**
 * How long an execution receipt is considered meaningful. Mirrors the pre-trade
 * and watch windows (600s): the receipt is a statement about a settlement that
 * already happened, not a live subscription.
 */
export const EXECUTION_VALID_FOR_SECONDS = 600;

/** Default slippage bound, signed alongside the observed drift. Callers may
 *  pass a tighter bound per action; the signed value is whatever was used. */
export const EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS = 50;

/**
 * Sentinel for `attestationAgeAtExecSeconds` when the paired pre-trade
 * attestation DID NOT EXIST at execution (the gate was signed after the fill,
 * so its age is undefined — Headless round-3, 2026-09-02).
 *
 * The layout is frozen (v1..v4 all carry this field as uint256), so the age
 * cannot be omitted; and a signed 0 was dishonest — 0 reads as "the freshest
 * possible gate", when the truth is "there was no gate yet". UINT32_MAX
 * (4294967295) is the sentinel: no real attestation age approaches it (the
 * receipts' own validUntil window is 600s), it encodes cleanly as a JSON
 * number and a uint256, and it is documented in the .well-known registry's
 * ExecutionReceipt entry so a verifier can interpret it without our source.
 * A receipt carrying the sentinel is, by construction, not FAITHFUL — the
 * precedence check in {@link deriveExecutionStatus} routes it to
 * UNDETERMINED.
 */
export const ATTESTATION_AGE_UNDEFINED_SENTINEL = 4294967295;

/** Quorum floor copied from the pre-trade/watch line so the three receipt
 *  types cannot drift on what "enough independent providers" means. */
export const EXECUTION_REQUIRED_PARTICIPANT_COUNT = 3;
/** Independence floor: distinct NON-DERIVED operator groups (TWAP excluded). */
export const EXECUTION_REQUIRED_SOURCE_GROUP_COUNT = 2;

/** Attester label (human-readable) carried in the JSON envelope, not signed. */
export const EXECUTION_ATTESTER_LABEL = 'Insight Execution Receipt';

/** EIP-712 domain. Distinct `name` from the pre-trade and watch domains so a
 *  receipt can never be replayed across surfaces. chainId=1 is a separator.
 *
 *  FROZEN for every schema version. EIP-712 domains only allow the five
 *  standard fields, so nothing may ever be added here; a version that needs to
 *  bind more context (v4's `environment`) declares it as a signed MESSAGE field
 *  instead. v3's attempt to carry `environment` on the domain never entered the
 *  digest (Headless H7) — v3 receipts verify against this domain like every
 *  other version. */
export const EXECUTION_DOMAIN = {
  name: 'Insight Execution',
  version: '1',
  chainId: 1,
} as const;

/**
 * The deployment environment a receipt was signed in.
 *
 * `production` is the hosted product on the public domain; anything else
 * (preview, branch deploy, local, test run) is `nonproduction`. This exists so
 * that once a production attester key ships, a staging receipt cannot be
 * presented as a production one — the difference is in the signed domain rather
 * than only in which key signed it.
 *
 * Derivation is a documented rule, not a guess: we check the configured public
 * app URL first (a preview deploy keeps its own URL) and fall back to the
 * platform's environment variable.
 */
export function executionEnvironment(): 'production' | 'nonproduction' {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  if (appUrl.includes('oracleinsight.xyz')) return 'production';
  if (process.env.VERCEL_ENV === 'production') return 'production';
  return 'nonproduction';
}

/** Resolve the EIP-712 domain for a signed schema version.
 *
 *  Every version (v1..v4) signs over the same frozen three-field domain. v3
 *  tried to vary the domain by deployment (`environment`, VERITAS F7), but
 *  EIP-712 domains cannot carry non-standard fields — signers drop them before
 *  hashing, so the variation never entered the signature (Headless H7). v4
 *  binds the deployment as a signed message field instead (the 44th); the
 *  domain itself stays constant so v1..v4 all re-derive from
 *  {@link EXECUTION_DOMAIN}. The parameter is kept for call-site clarity. */
export function executionDomainForSchemaVersion(_schemaVersion: number) {
  return EXECUTION_DOMAIN;
}

export const EXECUTION_PRIMARY_TYPE = 'ExecutionReceipt';

/**
 * The v1 signed fields (30). Enums are encoded as `string` (portable across
 * EIP-712 implementations); hashes are `bytes32`. Field order is fixed —
 * changing it changes every UID and is a schema-version bump.
 *
 * Layout is frozen: v1 receipts remain verifiable forever.
 */
export const EXECUTION_TYPES_V1 = {
  ExecutionReceipt: [
    { name: 'preTradeUid', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'settlementChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'quotedPrice', type: 'uint256' },
    { name: 'executedPrice', type: 'uint256' },
    { name: 'priceDeltaBps', type: 'int256' },
    { name: 'maxSlippageBps', type: 'uint256' },
    { name: 'slippageSatisfied', type: 'bool' },
    { name: 'quotedAmountUsd', type: 'uint256' },
    { name: 'executedAmountUsd', type: 'uint256' },
    { name: 'actualFeeUsd', type: 'uint256' },
    { name: 'fillStatus', type: 'string' },
    { name: 'executionStatus', type: 'string' },
    { name: 'txHash', type: 'bytes32' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'executedAt', type: 'uint256' },
    { name: 'oracleDataAgeAtExecSeconds', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
    { name: 'independenceSatisfied', type: 'bool' },
    { name: 'mevRiskBps', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/**
 * The v2 signed fields (32) = v1's 30 plus:
 *   - `bindingMode`, first in the layout so the trust level of the pre-trade
 *     binding is the first thing a reader or verifier sees;
 *   - `preTradeSignedAt`, next to `executedAt` so the ordering of gate and
 *     settlement is checkable from the receipt alone.
 */
export const EXECUTION_TYPES_V2 = {
  ExecutionReceipt: [
    { name: 'bindingMode', type: 'string' },
    { name: 'preTradeUid', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'settlementChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'quotedPrice', type: 'uint256' },
    { name: 'executedPrice', type: 'uint256' },
    { name: 'priceDeltaBps', type: 'int256' },
    { name: 'maxSlippageBps', type: 'uint256' },
    { name: 'slippageSatisfied', type: 'bool' },
    { name: 'quotedAmountUsd', type: 'uint256' },
    { name: 'executedAmountUsd', type: 'uint256' },
    { name: 'actualFeeUsd', type: 'uint256' },
    { name: 'fillStatus', type: 'string' },
    { name: 'executionStatus', type: 'string' },
    { name: 'txHash', type: 'bytes32' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'executedAt', type: 'uint256' },
    { name: 'preTradeSignedAt', type: 'uint256' },
    { name: 'oracleDataAgeAtExecSeconds', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
    { name: 'independenceSatisfied', type: 'bool' },
    { name: 'mevRiskBps', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/**
 * The v3 signed fields (43) = v2's 32, two of them renamed, plus eleven.
 *
 * Renamed (the old name over-stated its scope, so downstream readers could
 * over-read it):
 *   - `executionStatus`            -> `priceExecutionStatus` (F2)
 *   - `oracleDataAgeAtExecSeconds` -> `attestationAgeAtExecSeconds` (F5)
 *
 * Added, each next to the value it qualifies so a holder reads them together:
 *   - `claimRole`, `subject`, `taker`          right after the binding mode, so
 *     whose execution this is comes before anything claimed about it (F6);
 *   - `destinationPreTradeUid`, `preTradeUidsHash` beside `preTradeUid`, so the
 *     full quote basis is signed (F1);
 *   - `priceScale`                             after the two prices it scales (F7);
 *   - `quoteBasis`, `quoteBlockNumber`, `quoteVenueIndependent` after the
 *     prices, so the baseline and the venue-independence of the quote travel
 *     with the quote (F4, F3);
 *   - `measuredFieldsHash`                     after the four notional fields it
 *     describes (F2);
 *   - `priceStateAgeAtExecSeconds`             beside the renamed attestation
 *     age, so the two clocks are distinguishable (F5).
 */
export const EXECUTION_TYPES_V3 = {
  ExecutionReceipt: [
    { name: 'bindingMode', type: 'string' },
    { name: 'claimRole', type: 'string' },
    { name: 'subject', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'preTradeUid', type: 'bytes32' },
    { name: 'destinationPreTradeUid', type: 'bytes32' },
    { name: 'preTradeUidsHash', type: 'bytes32' },
    { name: 'requestHash', type: 'bytes32' },
    { name: 'sourceAssetId', type: 'string' },
    { name: 'destinationAssetId', type: 'string' },
    { name: 'subjectChainId', type: 'uint256' },
    { name: 'settlementChainId', type: 'uint256' },
    { name: 'action', type: 'string' },
    { name: 'quotedPrice', type: 'uint256' },
    { name: 'executedPrice', type: 'uint256' },
    { name: 'priceScale', type: 'uint8' },
    { name: 'quoteBasis', type: 'string' },
    { name: 'quoteBlockNumber', type: 'uint256' },
    { name: 'quoteVenueIndependent', type: 'bool' },
    { name: 'priceDeltaBps', type: 'int256' },
    { name: 'maxSlippageBps', type: 'uint256' },
    { name: 'slippageSatisfied', type: 'bool' },
    { name: 'quotedAmountUsd', type: 'uint256' },
    { name: 'executedAmountUsd', type: 'uint256' },
    { name: 'actualFeeUsd', type: 'uint256' },
    { name: 'measuredFieldsHash', type: 'bytes32' },
    { name: 'fillStatus', type: 'string' },
    { name: 'priceExecutionStatus', type: 'string' },
    { name: 'txHash', type: 'bytes32' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'executedAt', type: 'uint256' },
    { name: 'preTradeSignedAt', type: 'uint256' },
    { name: 'attestationAgeAtExecSeconds', type: 'uint256' },
    { name: 'priceStateAgeAtExecSeconds', type: 'uint256' },
    { name: 'participantCount', type: 'uint256' },
    { name: 'requiredParticipantCount', type: 'uint256' },
    { name: 'sourceGroupCount', type: 'uint256' },
    { name: 'requiredSourceGroupCount', type: 'uint256' },
    { name: 'independenceSatisfied', type: 'bool' },
    { name: 'mevRiskBps', type: 'uint256' },
    { name: 'reasonCodesHash', type: 'bytes32' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

/**
 * The v4 signed fields (44) = v3's 43 plus `environment`, appended LAST so the
 * v3 field order is a byte-identical prefix and the only change is the new
 * binding.
 *
 * `environment` is `'production' | 'nonproduction'` (see
 * {@link executionEnvironment}). v3 had declared it on the EIP-712 domain; a
 * byte-level recheck proved that never entered the signature, because domain
 * separators only support the five standard fields and signers drop the rest
 * (Headless H7). As a signed message field it is real: a staging receipt and a
 * production receipt signed by the same key now differ in the bytes. Verify
 * re-derives the value from the receipt's own `data.environment`, so stripping
 * or swapping it breaks the UID and the signature.
 */
export const EXECUTION_TYPES_V4 = {
  ExecutionReceipt: [
    ...EXECUTION_TYPES_V3.ExecutionReceipt,
    { name: 'environment', type: 'string' },
  ],
} as const;

/** Layout new receipts are signed with. */
export const EXECUTION_TYPES = EXECUTION_TYPES_V4;

/** Resolve the EIP-712 type layout for a signed schema version. Unknown
 *  versions fall back to the current layout, which fails UID recovery (a
 *  tampered or unsupported receipt must never verify, never throw). */
export function executionTypesForSchemaVersion(schemaVersion: number) {
  if (schemaVersion === EXECUTION_SCHEMA_VERSION) return EXECUTION_TYPES_V1;
  if (schemaVersion === EXECUTION_SCHEMA_VERSION_V2) return EXECUTION_TYPES_V2;
  if (schemaVersion === EXECUTION_SCHEMA_VERSION_V3) return EXECUTION_TYPES_V3;
  return EXECUTION_TYPES_V4;
}

// ---------------------------------------------------------------------------
// Scaling (matches the pre-trade + watch conventions)
// ---------------------------------------------------------------------------

const PRICE_SCALE = 1e8; // prices -> uint256
const USD_SCALE = 1e6; // USD amounts -> uint256
const RATIO_SCALE = 1e4; // 0..1 ratio -> bps
/** The power of ten {@link PRICE_SCALE} represents. Signed as v3's `priceScale`
 *  so the scale is declared in the struct rather than assumed by a reader. */
const PRICE_SCALE_EXPONENT = Math.log10(PRICE_SCALE);

/** Address that "no party is named" is encoded as. `subject`/`taker` are v3
 *  fields; an old receipt that cannot name anyone signs zero rather than
 *  implying a party. */
const ZERO_ADDRESS: `0x${string}` = `0x${'0'.repeat(40)}`;
/** The same idea for a bytes32 uid slot with no value. */
const ZERO_BYTES32: `0x${string}` = `0x${'0'.repeat(64)}`;

/** Returns a JSON-serializable uint256-encoded number. Mirrors v2/v3's
 *  `toUint`: viem's EIP-712 ops need bigint, so the public message stores
 *  numbers and {@link toBigIntMessage} widens them back only for the crypto.
 *  All values stay far under Number.MAX_SAFE_INTEGER, so the round trip is
 *  exact. This helper is for genuinely non-negative fields (prices, USD
 *  amounts, counts, ages). `priceDeltaBps` is NOT passed through here: it is a
 *  SIGNED quantity (negative = the agent got a better price than certified) and
 *  is carried as `int256`, so its sign is preserved in the signature. */
function toUint(n: number, scale: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n * scale));
}

// ---------------------------------------------------------------------------
// Status enums (string-valued; carried as `string`/`bool` in the EIP-712 types)
// ---------------------------------------------------------------------------

export type FillStatus = 'FULL' | 'PARTIAL' | 'REVERTED' | 'FAILED';

/**
 * The receipt's verdict, derived from the evidence it carries.
 *
 *   FAITHFUL     — filled in full, inside the slippage bound, and the oracle
 *                  still satisfied independence at execution.
 *   DEVIATED     — executed, but the fill drifted past the bound, was partial,
 *                  or the oracle's independence gate no longer held.
 *   NOT_EXECUTED — the transaction reverted or failed; nothing settled.
 *   UNDETERMINED — the evidence needed to judge faithfulness is missing (no
 *                  certified quote, or no readable fill price).
 *
 * UNDETERMINED exists for the same reason "specified but not demonstrated" is
 * recorded rather than assumed elsewhere in this codebase: when a price is
 * absent, saying FAITHFUL asserts a comparison that was never performed, and
 * saying DEVIATED asserts a drift that was never measured. Neither is honest,
 * so the verdict says which one it is.
 *
 * ## It is a verdict about PRICE, and since v3 the field says so
 *
 * The comparison is quoted price against filled price. Nothing here grades the
 * SIZE of the fill against the gate's own recommended cap, or the fee, or the
 * timing. That scope is defensible, but it was only ever stated in prose, and a
 * downstream reader had no way to know it from the bytes — a receipt binding a
 * settlement many times larger than the cap it was checked against still read
 * FAITHFUL, correctly by its own rules and misleadingly to anyone assuming
 * "faithful" meant "conformed to the gate".
 *
 * v3 renames the signed field to `priceExecutionStatus` so the scope travels in
 * the bytes. The values are unchanged, so v1/v2 receipts keep verifying; what
 * changed is that the name can no longer be over-read (VERITAS finding F2).
 *
 * This is Insight's verdict, in the same sense pre-trade's `verdict` is: it
 * describes whether the execution matched the price Insight certified, never
 * whether the price was right or the trade was wise.
 */
export type PriceExecutionStatus = 'FAITHFUL' | 'DEVIATED' | 'NOT_EXECUTED' | 'UNDETERMINED';

/** Legacy name, kept so v1/v2 payloads and their readers still type-check. All
 *  new code should use {@link PriceExecutionStatus} — the values never changed,
 *  only what the name promises. */
export type ExecutionStatus = PriceExecutionStatus;

/**
 * Whose execution this receipt is a statement about (v3, signed).
 *
 * This is not a formality. Insight reads settlements off chain; it does not
 * execute them. A receipt about a transaction a third party submitted is an
 * OBSERVER's statement, and a receipt about a trade Insight's own agent executed
 * is a FIRST-PARTY claim. Both are legitimate, they answer different questions,
 * and for evidence about what an agent did the difference is the whole point.
 * Nothing in v1 or v2 distinguished them: `taker` lived in an unsigned block, so
 * a holder could not tell whose trade they were reading about (VERITAS F6).
 *
 *   FIRST_PARTY_EXECUTION    — the subject is the party Insight attests acted,
 *                              and Insight is attesting its own execution.
 *   THIRD_PARTY_OBSERVATION  — Insight observed a settlement by someone else and
 *                              is reporting what it saw on chain.
 *
 * The default is THIRD_PARTY_OBSERVATION. That is the honest default for a
 * service that reads public settlements, and it means a caller must actively
 * claim the stronger role rather than receiving it.
 */
export type ClaimRole = 'FIRST_PARTY_EXECUTION' | 'THIRD_PARTY_OBSERVATION';

export const DEFAULT_CLAIM_ROLE: ClaimRole = 'THIRD_PARTY_OBSERVATION';

/**
 * Which price state the quoted price was taken against (v3, signed).
 *
 * Two defensible baselines sit about 0.6 bps apart on the pair this was found
 * on: the venue's mid at the close of the block BEFORE the settlement, and its
 * mid immediately before the swap inside the settlement block. At a 100 bps
 * tolerance the choice is immaterial; at 5 or 10 bps it is a material part of
 * the verdict, and in v2 nothing recorded which one was used (VERITAS F4).
 *
 *   PREV_BLOCK_CLOSE   — mid at the close of `quoteBlockNumber`, one or more
 *                        blocks before the settlement.
 *   PRE_SWAP_IN_BLOCK  — mid immediately before this swap, inside the
 *                        settlement block. The only convention consistent with
 *                        theory on a fee-paying venue: execution cannot beat the
 *                        mid it trades against.
 *   ORACLE_CONSENSUS   — the quote is the pre-trade oracle consensus, not a
 *                        venue mid at all.
 *   UNSPECIFIED        — the convention was not recorded. Receipts that cannot
 *                        say must not look like receipts that can.
 */
export type QuoteBasis =
  | 'PREV_BLOCK_CLOSE'
  | 'PRE_SWAP_IN_BLOCK'
  | 'ORACLE_CONSENSUS'
  | 'UNSPECIFIED';

export const DEFAULT_QUOTE_BASIS: QuoteBasis = 'UNSPECIFIED';

/** Reason codes specific to execution. Distinct from the pre-trade and watch
 *  sets: they describe what happened at settlement, not at quote time. */
export type ExecutionReasonCode =
  | 'SLIPPAGE_EXCEEDED'
  | 'PARTIAL_FILL'
  | 'TX_REVERTED'
  | 'TX_FAILED'
  | 'STALE_ORACLE_AT_EXEC'
  | 'INSUFFICIENT_QUORUM_AT_EXEC'
  | 'INSUFFICIENT_INDEPENDENCE_AT_EXEC'
  | 'FILL_PRICE_UNAVAILABLE'
  | 'NATIVE_ASSET_LEG'
  | 'PRICE_NOT_ATTRIBUTED'
  /** v2: the pre-trade gate was signed AFTER the trade settled, so it could not
   *  have gated it. A receipt that claims FAITHFUL must be able to rule this
   *  out; when it cannot, the verdict is UNDETERMINED. */
  | 'PRE_TRADE_AFTER_EXECUTION'
  /** v2: no pre-trade attestation was presented, so the binding is the caller's
   *  own assertion. The receipt still records what was claimed, but it refuses
   *  to grade faithfulness against an unproven quote. */
  | 'PRE_TRADE_NOT_PRESENTED';

/**
 * How the pre-trade binding in this receipt was established (v2, signed).
 *
 *   VERIFIED       — Insight verified the pre-trade attestation's signature and
 *                    copied every binding field out of the verified payload.
 *   SELF_REPORTED  — the caller asserted the binding fields; Insight re-signed
 *                    them but did not see a pre-trade attestation.
 *
 * This is not a nicety. A signature over caller-supplied values proves only
 * that we signed those values, so SELF_REPORTED is never allowed to reach a
 * FAITHFUL verdict: there is no proven quote to be faithful to.
 */
export type ExecutionBindingMode = 'VERIFIED' | 'SELF_REPORTED';

// ---------------------------------------------------------------------------
// Signed message shape
// ---------------------------------------------------------------------------

/** The signed fields as JSON-serializable numbers / hex strings (JSON can't
 *  carry bigint; the verify endpoint receives numbers off the wire).
 *
 *  `bindingMode` and `preTradeSignedAt` exist only in v2; v1 receipts omit them
 *  and are encoded against {@link EXECUTION_TYPES_V1}, which does not declare
 *  them. viem encodes strictly from the type layout, so extra keys are inert. */
export interface ExecutionReceiptData {
  /** v2 only: how the pre-trade binding was established. Absent on v1. */
  bindingMode?: ExecutionBindingMode;
  /** v3 only: whose execution this is. Absent on v1/v2, which could not say. */
  claimRole?: ClaimRole;
  /** v3 only: the party whose execution is being attested. */
  subject?: `0x${string}`;
  /** v3 only: the address whose balance changes define the fill, read from chain. */
  taker?: `0x${string}`;
  preTradeUid: `0x${string}`;
  /** v3 only: the SECOND gate quotedPrice was built from. `quotedPrice` is
   *  source consensus over destination consensus, so this gate supplies the
   *  entire volatile leg; v2 signed one uid and shipped this one unbound. */
  destinationPreTradeUid?: `0x${string}`;
  /** v3 only: commitment to the ordered set of gates the quote was built from.
   *  Generalises to multi-leg routes. Empty-set hash when no gate is proven. */
  preTradeUidsHash?: `0x${string}`;
  requestHash: `0x${string}`;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: number;
  settlementChainId: number;
  action: string;
  quotedPrice: number;
  executedPrice: number;
  /** v3 only: the power of ten the two prices above are scaled by. Signed so
   *  the scale is declared, not assumed — an assumed scale is how a 1e8 price
   *  field got read as a 1e6 USD field and produced a 100x error. */
  priceScale?: number;
  /** v3 only: which price state `quotedPrice` was taken against. */
  quoteBasis?: QuoteBasis;
  /** v3 only: the block `quotedPrice` was read from. 0 when not applicable. */
  quoteBlockNumber?: number;
  /** v3 only: whether the quote came from a source independent of the venue the
   *  agent executed on. False means the independence fields describe a nominal
   *  provider set rather than the price actually used. */
  quoteVenueIndependent?: boolean;
  priceDeltaBps: number;
  maxSlippageBps: number;
  slippageSatisfied: boolean;
  quotedAmountUsd: number;
  executedAmountUsd: number;
  actualFeeUsd: number;
  /** v3 only: commitment to which of the four notional fields above were
   *  genuinely measured. A signed zero without this is ambiguous between
   *  "measured, and it was zero" and "never measured". */
  measuredFieldsHash?: `0x${string}`;
  fillStatus: FillStatus;
  /** v3: the verdict, in a name that states its scope (price only). */
  priceExecutionStatus?: PriceExecutionStatus;
  /** v1/v2 legacy name for the same verdict, present only on receipts signed
   *  before the rename. v3 receipts do not set it. */
  executionStatus?: ExecutionStatus;
  txHash: `0x${string}`;
  blockNumber: number;
  executedAt: number;
  /** v2 only: unix seconds the paired pre-trade attestation was signed. Lets a
   *  holder check the gate preceded the settlement. Absent on v1. */
  preTradeSignedAt?: number;
  /** Age of the pre-trade ATTESTATION at execution: executedAt − preTradeSignedAt.
   *  v3's name for what v1/v2 called `oracleDataAgeAtExecSeconds` — that name
   *  was the finding (F5): a reader comparing it against the gate's
   *  maxDataAgeSeconds concluded the receipt was 2.5x past its staleness bound,
   *  because the two fields measure different clocks. */
  attestationAgeAtExecSeconds?: number;
  /** v1/v2 legacy name for {@link attestationAgeAtExecSeconds}. */
  oracleDataAgeAtExecSeconds?: number;
  /** v3 only: age of the PRICE STATE the quote was actually taken from, in
   *  seconds. On the verified example this is 12 while the attestation age is
   *  30 — both true, and before v3 there was only one field to hold them. */
  priceStateAgeAtExecSeconds?: number;
  participantCount: number;
  requiredParticipantCount: number;
  sourceGroupCount: number;
  requiredSourceGroupCount: number;
  independenceSatisfied: boolean;
  mevRiskBps: number;
  reasonCodesHash: `0x${string}`;
  validUntil: number;
  schemaVersion: number;
  /** v4 only: the deployment the receipt was signed in (`production` |
   *  `nonproduction`), signed as the 44th message field. v3 tried to carry it
   *  on the EIP-712 domain, which never entered the signature (H7). Absent on
   *  v1..v3, whose layouts do not declare it. */
  environment?: 'production' | 'nonproduction';
}

/** BigInt twin of {@link ExecutionReceiptData}, fed to viem's EIP-712 ops.
 *  Never serialized to JSON. */
export interface ExecutionBigIntMessage {
  /** v2 only. Must be populated whenever the v2 layout is used. */
  bindingMode?: string;
  /** v3. */
  claimRole?: string;
  subject?: `0x${string}`;
  taker?: `0x${string}`;
  preTradeUid: `0x${string}`;
  destinationPreTradeUid?: `0x${string}`;
  preTradeUidsHash?: `0x${string}`;
  requestHash: `0x${string}`;
  sourceAssetId: string;
  destinationAssetId: string;
  subjectChainId: bigint;
  settlementChainId: bigint;
  action: string;
  quotedPrice: bigint;
  executedPrice: bigint;
  priceScale?: bigint;
  quoteBasis?: string;
  quoteBlockNumber?: bigint;
  quoteVenueIndependent?: boolean;
  priceDeltaBps: bigint;
  maxSlippageBps: bigint;
  slippageSatisfied: boolean;
  quotedAmountUsd: bigint;
  executedAmountUsd: bigint;
  actualFeeUsd: bigint;
  measuredFieldsHash?: `0x${string}`;
  fillStatus: string;
  /** Both spellings are always populated. viem encodes strictly from the type
   *  layout, so the one the layout does not declare is inert — that is what
   *  lets one message object serve v1/v2 and v3. */
  priceExecutionStatus: string;
  executionStatus: string;
  txHash: `0x${string}`;
  blockNumber: bigint;
  executedAt: bigint;
  /** v2 only. Must be populated whenever the v2 layout is used. */
  preTradeSignedAt?: bigint;
  /** Both spellings populated, for the same reason as the status above. */
  attestationAgeAtExecSeconds: bigint;
  oracleDataAgeAtExecSeconds: bigint;
  priceStateAgeAtExecSeconds?: bigint;
  participantCount: bigint;
  requiredParticipantCount: bigint;
  sourceGroupCount: bigint;
  requiredSourceGroupCount: bigint;
  independenceSatisfied: boolean;
  mevRiskBps: bigint;
  reasonCodesHash: `0x${string}`;
  validUntil: bigint;
  schemaVersion: bigint;
  /** v4. Populated verbatim from `data.environment` whenever the v4 layout is
   *  used; on v1..v3 layouts the key is inert (viem encodes strictly from the
   *  type layout). */
  environment?: string;
}

/** Raw (un-scaled) inputs. Verdict fields are DERIVED inside buildMessage so
 *  the receipt can't disagree with its own signed evidence. */
export interface ExecutionReceiptInput {
  /** Optional: sign against a specific PUBLISHED layout (v1..v4) instead of the
   *  current one. Defaults to the current layout. The sample endpoint exposes
   *  this so an integrator can fetch a verifiable sample of ANY published
   *  version — the one layout nobody has exercised is the one nobody can
   *  integrate against (VERITAS round-2 N1). An unknown version falls back to
   *  the current layout rather than producing a receipt that claims a layout
   *  it does not use. */
  schemaVersion?: number;
  /** UID of the pre-trade attestation this execution was authorised against. */
  preTradeUid: `0x${string}`;
  /** The SAME canonical request commitment pre-trade signed. */
  requestHash: `0x${string}`;
  /** Unix seconds the paired pre-trade attestation was signed. Required for the
   *  v2 ordering check: a gate signed after the settlement cannot have gated it.
   *  When absent, the ordering is unknown and the verdict becomes UNDETERMINED
   *  rather than silently assumed favourable. */
  preTradeSignedAt: number;
  /** How {@link preTradeUid} / {@link requestHash} and the carried-forward
   *  oracle basis were established. Defaults to SELF_REPORTED, which can never
   *  reach a FAITHFUL verdict. */
  bindingMode?: ExecutionBindingMode;
  /** CAIP-19 source asset id. */
  sourceAssetId: string;
  /** CAIP-19 destination asset id. */
  destinationAssetId: string;
  subjectChainId: number;
  /** Chain the transaction actually settled on. */
  settlementChainId: number;
  action: string;
  /** Price pre-trade certified (raw, e.g. 2450.12). */
  quotedPrice: number;
  /** Price actually achieved on-chain (raw). 0 when nothing filled. */
  executedPrice: number;
  /** Slippage bound to judge the drift against. Defaults to
   *  {@link EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS}. */
  maxSlippageBps?: number;
  /** v3: whose execution this is. Defaults to THIRD_PARTY_OBSERVATION, because
   *  that is what an observer of public settlements actually is; a caller that
   *  wants the first-person claim has to say so. */
  claimRole?: ClaimRole;
  /** v3: the party whose execution is being attested. Defaults to the on-chain
   *  taker, which for an observed settlement is the party that traded. When it
   *  cannot be established it is the zero address, and the receipt says nothing
   *  about identity rather than implying one. */
  subject?: `0x${string}`;
  /** v3: the on-chain address whose balance changes define the fill. */
  taker?: `0x${string}`;
  /** v3: the second gate quotedPrice was built from. Required for a receipt
   *  that claims a bound quote basis; absent means the hash commitment binds
   *  only the source gate. */
  destinationPreTradeUid?: `0x${string}`;
  /** v3: the ordered set of gate uids the quote was built from. Defaults to
   *  [preTradeUid, destinationPreTradeUid] when the latter is supplied, and to
   *  [preTradeUid] otherwise — the receipt must never claim an ordered set it
   *  did not use. */
  preTradeUids?: ReadonlyArray<`0x${string}`>;
  /** v3: which baseline `quotedPrice` was taken against. Defaults to
   *  UNSPECIFIED — a receipt that does not know must not claim one. */
  quoteBasis?: QuoteBasis;
  /** v3: the block `quotedPrice` was read from. 0 when not applicable. */
  quoteBlockNumber?: number;
  /** v3: whether the quote is independent of the venue being executed on.
   *  Defaults to FALSE. That default is deliberate and is the honest one: the
   *  common construction derives the quote from the same venue, and claiming
   *  independence by omission would make the independence fields describe a
   *  nominal provider set rather than the price used. */
  quoteVenueIndependent?: boolean;
  /** v3: age of the price state the quote came from, seconds. Distinct from the
   *  attestation's own age; 0 when unknown. */
  priceStateAgeAtExecSeconds?: number;
  /** v3: which of the four notional fields were actually measured. Anything not
   *  listed is signed as unmeasured, so `0` can no longer be read as a real
   *  zero. Defaults to the empty set. */
  measuredFields?: ReadonlyArray<MeasurableExecutionField>;
  /** Notional the pre-trade check was scoped to (raw USD). */
  quotedAmountUsd: number;
  /** Notional actually filled (raw USD). */
  executedAmountUsd: number;
  /** Fees actually paid (raw USD). */
  actualFeeUsd: number;
  fillStatus: FillStatus;
  txHash: `0x${string}`;
  blockNumber: number;
  /** Execution time, unix seconds. */
  executedAt: number;
  /** Age of the pre-trade ATTESTATION at the moment of execution, seconds
   *  (executedAt − preTradeSignedAt). Not the age of the price state: that is
   *  `priceStateAgeAtExecSeconds`, and conflating the two made a compliant
   *  receipt read as 2.5x past the gate's staleness bound (VERITAS F5). */
  oracleDataAgeAtExecSeconds: number;
  participantCount: number;
  /** Distinct NON-DERIVED operator groups at execution. */
  sourceGroupCount: number;
  /** Advisory only: 0..1 MEV-exposure estimate. Never gates the verdict,
   *  matching the standing rule that model scores inform but do not decide. */
  mevRiskScore?: number;
  /** Reason codes explaining a non-FAITHFUL verdict. */
  reasonCodes?: ReadonlyArray<string>;
}

// ---------------------------------------------------------------------------
// Derived verdict fields
// ---------------------------------------------------------------------------

/**
 * Drift of the fill from the certified price, in basis points. Signed: positive
 * means the agent got a worse price than quoted, negative means better.
 * Guards a zero/absent quote (a receipt with no certified price must not claim
 * a drift), and returns 0 when nothing filled.
 */
export function derivePriceDeltaBps(quotedPrice: number, executedPrice: number): number {
  if (!Number.isFinite(quotedPrice) || quotedPrice <= 0) return 0;
  if (!Number.isFinite(executedPrice) || executedPrice <= 0) return 0;
  return Math.round(((executedPrice - quotedPrice) / quotedPrice) * RATIO_SCALE);
}

/**
 * The verdict. FAITHFUL requires the fill to be complete, inside the signed
 * bound, and the oracle independence gate to still hold at execution — the
 * receipt's claim is "executed on the price Insight certified", so a degraded
 * oracle basis is a deviation even when the fill itself was clean.
 *
 * Precedence matters: a reverted transaction is NOT_EXECUTED regardless of what
 * the prices say, and a missing price is UNDETERMINED before any comparison is
 * attempted, so the verdict can never be reached by comparing against a
 * placeholder zero.
 *
 * Adverse findings are graded BEFORE the binding checks, and FAITHFUL is graded
 * last. That asymmetry is deliberate:
 *   - A breach we can observe (slippage past the bound, independence lost,
 *     partial fill) is recorded even when the pre-trade binding was never
 *     proven — withholding it because the agent declined to show its gate would
 *     let an unproven submission hide a bad fill.
 *   - A clean bill of health is the one claim that must be earned. It requires
 *     a signature-verified pre-trade (bindingMode VERIFIED) that was signed
 *     BEFORE the trade settled. Otherwise the honest answer is UNDETERMINED:
 *     we cannot grade faithfulness against a quote nobody proved exists, or
 *     against a gate that post-dates the fill it supposedly authorised.
 */
export function deriveExecutionStatus(params: {
  fillStatus: FillStatus;
  slippageSatisfied: boolean;
  independenceSatisfied: boolean;
  quotedPrice: number;
  executedPrice: number;
  bindingMode: ExecutionBindingMode;
  preTradeSignedAt: number;
  executedAt: number;
}): ExecutionStatus {
  if (params.fillStatus === 'REVERTED' || params.fillStatus === 'FAILED') return 'NOT_EXECUTED';
  // No certified quote, or no readable fill price: the comparison this receipt
  // exists to make cannot be performed, so it says so instead of guessing a
  // direction.
  if (!(params.quotedPrice > 0) || !(params.executedPrice > 0)) return 'UNDETERMINED';
  if (!params.slippageSatisfied) return 'DEVIATED';
  if (!params.independenceSatisfied) return 'DEVIATED';
  if (params.fillStatus === 'PARTIAL') return 'DEVIATED';
  // The gate must precede the settlement it authorised. A pre-trade signed
  // after the fill could have been chosen to flatter it.
  if (
    !Number.isFinite(params.preTradeSignedAt) ||
    params.preTradeSignedAt <= 0 ||
    params.preTradeSignedAt > params.executedAt
  ) {
    return 'UNDETERMINED';
  }
  if (params.bindingMode !== 'VERIFIED') return 'UNDETERMINED';
  return 'FAITHFUL';
}

// ---------------------------------------------------------------------------
// Message construction
// ---------------------------------------------------------------------------

export async function buildExecutionMessage(
  input: ExecutionReceiptInput
): Promise<ExecutionReceiptData> {
  const maxSlippageBps = input.maxSlippageBps ?? EXECUTION_DEFAULT_MAX_SLIPPAGE_BPS;

  // Derived INSIDE buildMessage: a receipt can never disagree with the numbers
  // it carries (same rationale as v2's hashes and statuses).
  const bindingMode: ExecutionBindingMode = input.bindingMode ?? 'SELF_REPORTED';
  const priceDeltaBps = derivePriceDeltaBps(input.quotedPrice, input.executedPrice);
  // The receipt does not assume which direction of the price is "worse" — the
  // service documents that the caller owns the quoted/executed price convention
  // (destination-per-source, source-per-destination, or otherwise). So slippage
  // is a symmetric tolerance band: the fill must land within ±maxSlippageBps of
  // the certified price. A drift outside the band in EITHER direction is a
  // deviation worth flagging (e.g. the oracle was stale in the other direction).
  const slippageSatisfied = Math.abs(priceDeltaBps) <= maxSlippageBps;
  const independenceSatisfied = input.sourceGroupCount >= EXECUTION_REQUIRED_SOURCE_GROUP_COUNT;
  const executionStatus = deriveExecutionStatus({
    fillStatus: input.fillStatus,
    slippageSatisfied,
    independenceSatisfied,
    quotedPrice: input.quotedPrice,
    executedPrice: input.executedPrice,
    bindingMode,
    preTradeSignedAt: input.preTradeSignedAt,
    executedAt: input.executedAt,
  });
  const reasonCodesHash = computeReasonCodesHash(input.reasonCodes ?? []);
  const validUntil = input.executedAt + EXECUTION_VALID_FOR_SECONDS;

  // --- v3 claims, each derived with an honest default so that nothing is
  // implied by omission. A field that cannot be stated is stated as absent. ---
  const claimRole: ClaimRole = input.claimRole ?? DEFAULT_CLAIM_ROLE;
  const quoteBasis: QuoteBasis = input.quoteBasis ?? DEFAULT_QUOTE_BASIS;
  // Independence is claimed only when it was real. The common construction
  // derives the quote from the venue itself, and silence must not read as
  // independence (VERITAS F3).
  const quoteVenueIndependent = input.quoteVenueIndependent ?? false;
  const measuredFieldsHash = computeMeasuredFieldsHash(input.measuredFields ?? []);
  // Commit to the ordered gate set actually used: both legs when a destination
  // gate was proven, the single source gate otherwise. Never a set the receipt
  // did not build its quote from.
  const preTradeUids =
    input.preTradeUids ??
    (input.destinationPreTradeUid
      ? [input.preTradeUid, input.destinationPreTradeUid]
      : [input.preTradeUid]);
  const preTradeUidsHash = computePreTradeUidsHash(preTradeUids);
  // Addresses are case-insensitive; normalising to lowercase keeps the signed
  // bytes deterministic for the same party, whatever casing the caller used
  // (EIP-55 checksum is a display convention, not part of the address).
  const taker = (input.taker ?? ZERO_ADDRESS).toLowerCase() as `0x${string}`;
  // An observed settlement is a statement about whoever traded; when no on-chain
  // taker can be established, the subject is zero rather than an implied party.
  const subject = input.subject ? (input.subject.toLowerCase() as `0x${string}`) : taker;
  const destinationPreTradeUid = input.destinationPreTradeUid ?? ZERO_BYTES32;
  const priceStateAgeAtExecSeconds = Math.max(0, Math.floor(input.priceStateAgeAtExecSeconds ?? 0));

  // --- v4: where this was signed ---
  // Signed as a message field (44th). v3 declared it on the EIP-712 domain,
  // which signers drop before hashing, so the deployment separation was never
  // cryptographic (Headless H7). As a signed field it is.
  const environment = executionEnvironment();

  return {
    bindingMode,
    claimRole,
    subject,
    taker,
    preTradeUid: input.preTradeUid,
    destinationPreTradeUid,
    preTradeUidsHash,
    requestHash: input.requestHash,
    sourceAssetId: input.sourceAssetId,
    destinationAssetId: input.destinationAssetId,
    subjectChainId: input.subjectChainId,
    settlementChainId: input.settlementChainId,
    action: input.action,
    quotedPrice: toUint(input.quotedPrice, PRICE_SCALE),
    executedPrice: toUint(input.executedPrice, PRICE_SCALE),
    priceScale: PRICE_SCALE_EXPONENT,
    quoteBasis,
    quoteBlockNumber: Math.max(0, Math.floor(input.quoteBlockNumber ?? 0)),
    quoteVenueIndependent,
    priceDeltaBps: Math.trunc(priceDeltaBps),
    maxSlippageBps: Math.max(0, Math.trunc(maxSlippageBps)),
    slippageSatisfied,
    quotedAmountUsd: toUint(input.quotedAmountUsd, USD_SCALE),
    executedAmountUsd: toUint(input.executedAmountUsd, USD_SCALE),
    actualFeeUsd: toUint(input.actualFeeUsd, USD_SCALE),
    measuredFieldsHash,
    fillStatus: input.fillStatus,
    priceExecutionStatus: executionStatus,
    txHash: input.txHash,
    blockNumber: Math.max(0, Math.floor(input.blockNumber)),
    executedAt: Math.max(0, Math.floor(input.executedAt)),
    preTradeSignedAt: Math.max(0, Math.floor(input.preTradeSignedAt)),
    // H8-adjacent (Headless round 3): a NEGATIVE age means the pre-trade
    // attestation was signed AFTER the fill — it did not exist at execution,
    // so its age is undefined, not 0. Clamping to 0 (the old behaviour) signed
    // "the freshest possible gate" over a gate that post-dates the trade it
    // supposedly authorised. The sentinel says "undefined" in the bytes; the
    // verdict layer independently refuses FAITHFUL on the ordering violation.
    attestationAgeAtExecSeconds:
      Number.isFinite(input.oracleDataAgeAtExecSeconds) && input.oracleDataAgeAtExecSeconds >= 0
        ? Math.floor(input.oracleDataAgeAtExecSeconds)
        : ATTESTATION_AGE_UNDEFINED_SENTINEL,
    priceStateAgeAtExecSeconds,
    participantCount: Math.max(0, Math.floor(input.participantCount)),
    requiredParticipantCount: EXECUTION_REQUIRED_PARTICIPANT_COUNT,
    sourceGroupCount: Math.max(0, Math.floor(input.sourceGroupCount)),
    requiredSourceGroupCount: EXECUTION_REQUIRED_SOURCE_GROUP_COUNT,
    independenceSatisfied,
    mevRiskBps: toUint(input.mevRiskScore ?? 0, RATIO_SCALE),
    reasonCodesHash,
    validUntil,
    // Signed against the requested PUBLISHED layout when one was asked for
    // (sample of any version, N1); unknown versions fall back to current.
    schemaVersion: SUPPORTED_EXECUTION_SCHEMA_VERSIONS.includes(
      input.schemaVersion as (typeof SUPPORTED_EXECUTION_SCHEMA_VERSIONS)[number]
    )
      ? (input.schemaVersion as (typeof SUPPORTED_EXECUTION_SCHEMA_VERSIONS)[number])
      : CURRENT_EXECUTION_SCHEMA_VERSION,
    environment,
  };
}

/** Widen the JSON-serializable message to its bigint twin for viem. Pure.
 *
 *  Every key is populated, including both spellings of the renamed fields and
 *  defaults for fields a schema version does not carry. viem encodes strictly
 *  from the type layout resolved by `schemaVersion`, so keys the layout does
 *  not declare are inert and a single object serves v1, v2 and v3. */
export function toBigIntMessage(data: ExecutionReceiptData): ExecutionBigIntMessage {
  const schemaVersion = Number(data.schemaVersion) || CURRENT_EXECUTION_SCHEMA_VERSION;
  const verdict = data.priceExecutionStatus ?? data.executionStatus ?? 'UNDETERMINED';
  const attestationAge = data.attestationAgeAtExecSeconds ?? data.oracleDataAgeAtExecSeconds ?? 0;
  return {
    bindingMode: data.bindingMode ?? 'SELF_REPORTED',
    claimRole: data.claimRole ?? DEFAULT_CLAIM_ROLE,
    subject: data.subject ?? data.taker ?? ZERO_ADDRESS,
    taker: data.taker ?? ZERO_ADDRESS,
    preTradeUid: data.preTradeUid,
    destinationPreTradeUid: data.destinationPreTradeUid ?? ZERO_BYTES32,
    preTradeUidsHash: data.preTradeUidsHash ?? computePreTradeUidsHash([]),
    requestHash: data.requestHash,
    sourceAssetId: data.sourceAssetId,
    destinationAssetId: data.destinationAssetId,
    subjectChainId: BigInt(data.subjectChainId),
    settlementChainId: BigInt(data.settlementChainId),
    action: data.action,
    quotedPrice: BigInt(data.quotedPrice),
    executedPrice: BigInt(data.executedPrice),
    priceScale: BigInt(data.priceScale ?? PRICE_SCALE_EXPONENT),
    quoteBasis: data.quoteBasis ?? DEFAULT_QUOTE_BASIS,
    quoteBlockNumber: BigInt(data.quoteBlockNumber ?? 0),
    quoteVenueIndependent: data.quoteVenueIndependent ?? false,
    priceDeltaBps: BigInt(data.priceDeltaBps),
    maxSlippageBps: BigInt(data.maxSlippageBps),
    slippageSatisfied: data.slippageSatisfied,
    quotedAmountUsd: BigInt(data.quotedAmountUsd),
    executedAmountUsd: BigInt(data.executedAmountUsd),
    actualFeeUsd: BigInt(data.actualFeeUsd),
    measuredFieldsHash: data.measuredFieldsHash ?? computeMeasuredFieldsHash([]),
    fillStatus: data.fillStatus,
    priceExecutionStatus: verdict,
    executionStatus: verdict,
    txHash: data.txHash,
    blockNumber: BigInt(data.blockNumber),
    executedAt: BigInt(data.executedAt),
    preTradeSignedAt: BigInt(data.preTradeSignedAt ?? 0),
    attestationAgeAtExecSeconds: BigInt(attestationAge),
    oracleDataAgeAtExecSeconds: BigInt(attestationAge),
    priceStateAgeAtExecSeconds: BigInt(data.priceStateAgeAtExecSeconds ?? 0),
    participantCount: BigInt(data.participantCount),
    requiredParticipantCount: BigInt(data.requiredParticipantCount),
    sourceGroupCount: BigInt(data.sourceGroupCount),
    requiredSourceGroupCount: BigInt(data.requiredSourceGroupCount),
    independenceSatisfied: data.independenceSatisfied,
    mevRiskBps: BigInt(data.mevRiskBps),
    reasonCodesHash: data.reasonCodesHash,
    validUntil: BigInt(data.validUntil),
    schemaVersion: BigInt(schemaVersion),
    // Populated verbatim from the receipt's own data: a v4 signature commits
    // to exactly the string the signer wrote, and a stripped or swapped value
    // must break recovery. An absent value encodes as '' — never a default
    // guess — so a v4 receipt missing `environment` cannot verify.
    environment: data.environment ?? '',
  };
}

/** EIP-712 typed-data args (domain + types + message) — shared by sign/verify.
 *  The type layout resolves from the signed `schemaVersion`; the domain is the
 *  frozen three-field one for every version. v1..v3 receipts keep verifying
 *  because that is the domain they were signed over; v4 additionally binds the
 *  deployment via its signed `environment` message field. */
export function executionTypedDataArgs(message: ExecutionReceiptData) {
  return {
    domain: executionDomainForSchemaVersion(message.schemaVersion),
    types: executionTypesForSchemaVersion(message.schemaVersion),
    primaryType: EXECUTION_PRIMARY_TYPE,
    message: toBigIntMessage(message),
  } as const;
}

/**
 * Field-name aliases for the two renames between v1/v2 and v3 (VERITAS F2/F5).
 * A layout that still declares the OLD spelling must be served its values under
 * that spelling: `buildExecutionMessage` emits only the current names, while the
 * signature covered the old ones (viem encodes strictly from the layout), so a
 * projected payload has to translate back. Values never changed, only names.
 */
const EXECUTION_LEGACY_FIELD_ALIASES = {
  executionStatus: 'priceExecutionStatus',
  oracleDataAgeAtExecSeconds: 'attestationAgeAtExecSeconds',
} as const;

/**
 * Project a fully-populated current-layout message onto the field set and the
 * spellings that a PUBLISHED layout (v1..v4) declares, for payloads handed to
 * a reader (the sample endpoint). The signature is untouched: it covered the
 * requested layout all along, so projecting only decides which keys travel
 * beside it. A holder can then rebuild the typed data from the projected data
 * plus the published layout alone, with no private field-name mapping.
 *
 * Without this, a v1 sample shipped the full current-layout message (44 keys,
 * current spellings) beside a 30-field v1 type declaration — self-inconsistent
 * for any independent verifier that rebuilds from the payload (found while
 * closing VERITAS round-3 F0/F8: the v1 sample must be independently
 * verifiable, not just verifiable by our own endpoint).
 *
 * v4 (current) is returned unchanged. Unknown versions fall back to v4 the
 * same way the signer does. A field the message cannot supply fails loudly:
 * a projected payload must never carry a hole.
 */
export function projectExecutionDataForSchemaVersion(
  data: ExecutionReceiptData,
  schemaVersion: number
): ExecutionReceiptData {
  if (schemaVersion === CURRENT_EXECUTION_SCHEMA_VERSION) return data;
  const layout = executionTypesForSchemaVersion(schemaVersion);
  const fields = layout.ExecutionReceipt;
  const source = data as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const name = field.name;
    const currentName =
      name in EXECUTION_LEGACY_FIELD_ALIASES
        ? EXECUTION_LEGACY_FIELD_ALIASES[name as keyof typeof EXECUTION_LEGACY_FIELD_ALIASES]
        : name;
    if (!(currentName in source)) {
      throw new Error(
        `projectExecutionDataForSchemaVersion: v${schemaVersion} layout declares "${name}" but the message carries no "${currentName}"`
      );
    }
    out[name] = source[currentName];
  }
  return out as unknown as ExecutionReceiptData;
}

// ---------------------------------------------------------------------------
// Public envelope
// ---------------------------------------------------------------------------

export interface ExecutionReceipt {
  uid: string;
  schemaVersion: number;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  validForSeconds: number;
  validUntil: number;
  signature: string;
  verifyUrl: string;
  data: ExecutionReceiptData;
  /** Informational only — verification always re-derives domain and types from
   *  `data.schemaVersion`, never from this block. */
  eip712: {
    domain: typeof EXECUTION_DOMAIN;
    // Any published layout may be recorded here (the receipt is informational;
    // verification re-derives the types from data.schemaVersion), so the field
    // is the union of every version's types, not just the current one.
    types: ReturnType<typeof executionTypesForSchemaVersion>;
    primaryType: typeof EXECUTION_PRIMARY_TYPE;
  };
}

function getVerifyUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production'
      ? 'https://www.oracleinsight.xyz'
      : 'http://localhost:3000');
  return `${base}/api/v1/execution/attestation/verify`;
}

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

/** Sign an execution fact. Returns null when no attester key is configured:
 *  the execution data itself remains valid and unchanged; the receipt is
 *  additive and must never become a dependency of the settlement path.
 *
 *  `opts.sample` (Headless H8, 2026-09-02): sign with the DEDICATED sample
 *  signer instead of the production attester, so a synthetic demo receipt is
 *  distinguishable from a real one by its signer alone — the .well-known
 *  registry publishes the sample key with role "sample". When the sample key
 *  is unconfigured this returns null (fail-closed): a production key must
 *  never sign a sample, and there is no fallback. */
export async function signExecutionReceipt(
  input: ExecutionReceiptInput,
  opts?: { sample?: boolean }
): Promise<ExecutionReceipt | null> {
  const account = opts?.sample ? await getSampleAttesterAccount() : await getAttesterAccount();
  if (!account) return null;

  try {
    const { hashTypedData } = await import('viem');
    const message = await buildExecutionMessage(input);
    const args = executionTypedDataArgs(message);

    const signature = await account.signTypedData(args);
    const uid = hashTypedData(args);

    return {
      uid,
      schemaVersion: message.schemaVersion,
      attester: account.address,
      attesterLabel: EXECUTION_ATTESTER_LABEL,
      signedAt: new Date().toISOString(),
      validForSeconds: EXECUTION_VALID_FOR_SECONDS,
      validUntil: message.validUntil,
      signature,
      verifyUrl: getVerifyUrl(),
      data: message,
      eip712: {
        domain: executionDomainForSchemaVersion(message.schemaVersion),
        types: executionTypesForSchemaVersion(message.schemaVersion),
        primaryType: EXECUTION_PRIMARY_TYPE,
      },
    };
  } catch (error) {
    logger.warn('Failed to sign execution receipt', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Verify
// ---------------------------------------------------------------------------

export interface ExecutionVerificationResult {
  valid: boolean;
  attester: string;
  uid: string;
  executedAt: number | null;
  validUntil: number | null;
  expired: boolean;
  executionStatus: ExecutionStatus | null;
  /** How the pre-trade binding was established. `null` on v1 receipts, which
   *  predate the field — callers must treat null as "binding strength not
   *  declared", not as VERIFIED. */
  bindingMode: ExecutionBindingMode | null;
  schemaVersion: number;
  reason: string;
}

/** Verify an execution receipt: recompute the UID, recover the signer, check
 *  the window. Anyone can call this against a receipt they were handed. */
export async function verifyExecutionReceipt(
  receipt: ExecutionReceipt
): Promise<ExecutionVerificationResult> {
  try {
    const { verifyTypedData, hashTypedData } = await import('viem');
    const message = receipt.data;
    const args = executionTypedDataArgs(message);
    const bindingMode = message.bindingMode ?? null;
    const schemaVersion = Number(message.schemaVersion) || 0;

    const expectedUid = hashTypedData(args);
    if (expectedUid !== receipt.uid) {
      return {
        valid: false,
        attester: receipt.attester,
        uid: receipt.uid,
        executedAt: Number(message.executedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired: false,
        executionStatus: message.priceExecutionStatus ?? message.executionStatus ?? null,
        bindingMode,
        schemaVersion,
        reason: 'uid_mismatch: data was modified after signing',
      };
    }

    const signatureValid = await verifyTypedData({
      ...args,
      address: receipt.attester as `0x${string}`,
      signature: receipt.signature as `0x${string}`,
    });

    const now = nowInSeconds();
    const expired = Number(message.validUntil) <= now;

    if (!signatureValid) {
      return {
        valid: false,
        attester: receipt.attester,
        uid: receipt.uid,
        executedAt: Number(message.executedAt) || null,
        validUntil: Number(message.validUntil) || null,
        expired,
        executionStatus: message.priceExecutionStatus ?? message.executionStatus ?? null,
        bindingMode,
        schemaVersion,
        reason: 'signature_invalid: not signed by the claimed attester',
      };
    }

    return {
      valid: !expired,
      attester: receipt.attester,
      uid: receipt.uid,
      executedAt: Number(message.executedAt) || null,
      validUntil: Number(message.validUntil) || null,
      expired,
      executionStatus: message.priceExecutionStatus ?? message.executionStatus ?? null,
      bindingMode,
      schemaVersion,
      reason: expired ? 'receipt_expired' : 'verified',
    };
  } catch (error) {
    return {
      valid: false,
      attester: receipt.attester ?? '',
      uid: receipt.uid ?? '',
      executedAt: null,
      validUntil: null,
      expired: false,
      executionStatus: null,
      bindingMode: null,
      schemaVersion: 0,
      reason: `verification_error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
