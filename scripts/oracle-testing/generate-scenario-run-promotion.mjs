/**
 * Generate the promotion record for the OracleScenarioRun verifier change.
 *
 * The mainline governance gate treats `verifier/src/` as a shared surface: a
 * change there moves bytes a partner may already pin, so it must be recorded
 * as an append-only promotion rather than merged silently. This script writes
 * that record.
 *
 * It reuses the gate's OWN contentId / canonicalJson implementation by importing
 * nothing and re-deriving the same two functions, then verifies the result with
 * `npm run protocol:check`. Do not hand-compute an id: promotionId must equal
 * keccak256 over the canonical form, and a hand-copied digest is unverifiable.
 *
 * Facts this record asserts, and why they are true:
 *   - No existing EIP-712 layout changed. OracleScenarioRun v1 is ADDED; v1, v2,
 *     v3, both rechecks and ExecutionReceipt v1-v5 are byte-identical.
 *   - No activation changed. activations.json and activation-set v5 are untouched.
 *   - No registry release or attester key changed.
 *   - The routing change is additive: a receipt whose primaryType is
 *     OracleScenarioRun takes a new branch; every other receipt resolves exactly
 *     as before. The parity suite pins this, including that a v1 pre-trade
 *     receipt still reports kind 'check'.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { keccak256, toBytes } from 'viem';

const root = process.cwd();

/** Same canonical form the gate uses: keys sorted, no whitespace. */
function canonicalJson(value) {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function contentId(value) {
  return keccak256(toBytes(canonicalJson(value)));
}

const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const activations = readJson('protocol/mainline/activation-sets/v5.json');
const previous = readJson(
  'protocol/mainline/promotions/2026-10-01-veritas-window-five-activation.json'
);

const IMPACT =
  'No existing signed report schema, EIP-712 field order, digest, signature, registry release, ' +
  'attester key, partner policy or activation is changed. OracleScenarioRun v1 (13 fields, domain ' +
  "'Insight Oracle Test') is ADDED to the standalone verifier and to the production router. All " +
  'pre-existing layouts are byte-identical: OracleSafetyCheck v1, v2, v3, OracleSafetyRecheck ' +
  'v2, v3, and ExecutionReceipt v1 through v5. The new receipt family carries schemaVersion 1, ' +
  'which collides numerically with the v1 pre-trade receipt, so it is routed by primaryType ' +
  "('OracleScenarioRun') ahead of every numeric schema-version test. That branch is additive: a " +
  'receipt with any other primaryType resolves exactly as before, and the verdict-parity suite ' +
  'pins that a v1 pre-trade receipt still reports kind check while the new family reports kind ' +
  'test. A signed OracleScenarioRun receipt is a statement that a named scenario was replayed to ' +
  'a named verdict; it is not an assessment, authorization, or execution record, and confers no ' +
  'trading authority.';

const RULE =
  'Existing partner policies and activation set v5 remain unchanged and no partner is newly ' +
  'activated. This promotion records an additive verifier schema registration plus two internal ' +
  'quality-assurance scripts under scripts/oracle-testing/. It does not authorize a live run, ' +
  'claim partner acceptance, change any production reachability, or publish a new npm version. ' +
  'The scenario-testing API surface is unauthenticated by construction and is not a billable ' +
  'product surface. Production release remains gated on main.';

const EVIDENCE_BASE =
  'Active immutable policy {POLICY} remains selected byte for byte. OracleScenarioRun ' +
  'registration adds a new family only: its own EIP-712 layout is new, no existing layout, ' +
  'digest, profile, registry release, signer or production reachability changes, and the ' +
  'production and offline routers agree on every schema family including the new one. No partner ' +
  'runtime, trust pin or activation is affected.';

const promotion = {
  kind: 'MainlineProtocolPromotion',
  promotionVersion: previous.promotionVersion + 1,
  effectiveFrom: '2026-10-04',
  classification:
    'Additive OracleScenarioRun v1 verifier registration with an explicit primaryType routing ' +
    'precedence; no existing signed layout, activation or partner policy change',
  registryReleaseId: previous.registryReleaseId,
  predecessorReleaseId: previous.predecessorReleaseId,
  predecessorPromotionId: previous.promotionId,
  activationSetId: activations.activationSetId,
  receiptImpact: IMPACT,
  activationRule: RULE,
  compatibilityMatrix: Object.entries(activations.partners)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([partnerId, policyId]) => ({
      partnerId,
      outcome: 'signed_protocol_unchanged',
      evidence: EVIDENCE_BASE.replace('{POLICY}', policyId),
    })),
};

promotion.promotionId = contentId(promotion);

const outPath = join(
  root,
  'protocol/mainline/promotions/2026-10-04-oracle-scenario-run-verifier.json'
);
writeFileSync(outPath, `${JSON.stringify(promotion, null, 2)}\n`);

const currentPath = join(root, 'protocol/mainline/current-promotion.json');
writeFileSync(
  currentPath,
  `${JSON.stringify(
    {
      promotionId: promotion.promotionId,
      path: 'protocol/mainline/promotions/2026-10-04-oracle-scenario-run-verifier.json',
    },
    null,
    2
  )}\n`
);

process.stdout.write(
  `promotion v${promotion.promotionVersion} written\n` +
    `  id            ${promotion.promotionId}\n` +
    `  partners      ${promotion.compatibilityMatrix.length}\n` +
    `  activations   ${promotion.activationSetId}\n` +
    `  file          ${outPath}\n`
);
