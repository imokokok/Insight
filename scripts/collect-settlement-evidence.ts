/* eslint-disable no-console */
/**
 * Settlement-evidence collector entry (runs as a step inside
 * snapshot-collect.yml's evidence job, every 15 minutes).
 *
 * Watches public Polymarket crypto price contracts, collects independent
 * Kraken 1-minute candles for windows that just settled, and builds + signs
 * evidence packs for resolved markets. Delivery policy is enforced in the
 * library: raw Kraken candles stay internal; only derived analytics are
 * persisted into the delivered pack.
 *
 * Run locally:
 *   npx tsx --env-file=.env.local scripts/collect-settlement-evidence.ts
 *
 * Requires: TURSO_PRICE_DATABASE_URL + TURSO_PRICE_AUTH_TOKEN.
 * Optional: ATTESTATION_SIGNER_PRIVATE_KEY (packs stay unsigned without it),
 *           POLYMARKET_GAMMA_BASE_URL (defaults to the public API).
 */
import { getAttesterAccount } from '@/lib/attestations/attesterAccount';
import { collectSettlementEvidence } from '@/lib/settlementEvidence/collector';

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[collect-settlement-evidence] starting…');

  const attester = await getAttesterAccount();
  if (!attester) {
    console.log(
      '[collect-settlement-evidence] no attester key configured — evidence packs will be persisted WITHOUT a signature'
    );
  }

  const result = await collectSettlementEvidence({
    gammaBaseUrl: process.env.POLYMARKET_GAMMA_BASE_URL?.trim() || undefined,
    attester,
  });

  console.log(
    `[collect-settlement-evidence] watchUpserted=${result.watchUpserted} ` +
      `candleMarkets=${result.candleMarkets} candlesUpserted=${result.candlesUpserted} ` +
      `packsBuilt=${result.packsBuilt} packsSigned=${result.packsSigned} ` +
      `grades=${JSON.stringify(result.grades)}`
  );
  console.log(
    `[collect-settlement-evidence] done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`
  );
}

const HARD_DEADLINE_MS = Number(process.env.SETTLEMENT_EVIDENCE_DEADLINE_MS) || 5 * 60 * 1000;
const deadlineTimer = setTimeout(() => {
  console.error(
    `[collect-settlement-evidence] hard deadline (${HARD_DEADLINE_MS}ms) exceeded — forcing exit`
  );
  process.exit(1);
}, HARD_DEADLINE_MS);
deadlineTimer.unref?.();

main()
  .then(() => {
    clearTimeout(deadlineTimer);
    const graceTimer = setTimeout(() => process.exit(0), 2000);
    graceTimer.unref?.();
  })
  .catch((error) => {
    clearTimeout(deadlineTimer);
    console.error('[collect-settlement-evidence] unhandled error:', error);
    process.exit(1);
  });
