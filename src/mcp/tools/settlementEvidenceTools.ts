import { getEvidencePack, listEvidencePacks } from '@/lib/settlementEvidence/repository';

import { SettlementEvidenceInputSchema } from './schemas';

import type { McpToolDefinition } from './types';

/**
 * `get_settlement_evidence` — signed prediction-market settlement evidence.
 *
 * Chain-neutral derived analytics (the Kraken candles behind each verdict are
 * vendor-licensed internal collection artifacts and are never exposed; only
 * the graded comparison leaves the system). Registered in the x402
 * chain-neutral payment-scope registry like the other read-only tools.
 */
export const getSettlementEvidenceTool: McpToolDefinition<typeof SettlementEvidenceInputSchema> = {
  name: 'get_settlement_evidence',
  description:
    'Get Insight-signed settlement evidence for prediction-market crypto price contracts: ' +
    'the declared outcome vs Insight’s independent verdict, price change and oracle deviation ' +
    'in basis points, candle coverage, and a consistency grade (consistent / inconsistent / ' +
    'insufficient_data). Pass slug for one market, or omit it to list recent packs. ' +
    'Derived analytics only; raw venue candles are not distributed.',
  parameters: SettlementEvidenceInputSchema,
  handler: async (args) => {
    const RIGHTS_NOTICE =
      'Derived analytics only. Settlement-window venue data is vendor-licensed for Insight’s internal analysis and is not redistributed.';

    if (args.slug) {
      const pack = await getEvidencePack(args.slug);
      if (!pack) {
        return `No settlement-evidence pack exists for "${args.slug}". Packs are produced after a market resolves.`;
      }
      const { payload, attestation } = pack;
      const lines = [
        `**Settlement evidence: ${payload.marketSlug}**`,
        `- Question: ${payload.question}`,
        `- Asset / venue: ${payload.asset}, declared venue ${payload.settlementVenue}`,
        `- Window: ${new Date(payload.windowStartMs).toISOString()} → ${new Date(payload.windowEndMs).toISOString()} (${payload.windowSeconds}s)`,
        `- Declared outcome: ${payload.declaredOutcome ?? 'unresolved'}`,
        `- Independent verdict: ${payload.independentOutcome ?? 'unavailable'}`,
        `- Window price change: ${payload.priceChangeBps === null ? 'n/a' : `${payload.priceChangeBps} bps`}`,
        `- Oracle deviation: ${payload.oracleDeviationBps === null ? 'no aligned consensus snapshot' : `${payload.oracleDeviationBps} bps`}`,
        `- Candle coverage: ${payload.candleCoverageE4 === null ? 'n/a' : `${(payload.candleCoverageE4 / 100).toFixed(1)}%`}`,
        `- Grade: ${payload.grade.toUpperCase()} (${payload.gradeReasonCodes.join(', ')})`,
        `- Payload hash: ${pack.payloadHash}`,
      ];
      if (attestation) {
        lines.push(
          `- Attestation: uid ${attestation.uid}`,
          `  attester ${attestation.attester}, signed ${attestation.signedAt}, valid ${attestation.validForSeconds}s`,
          `  EIP-712 domain "${attestation.eip712.domain.name}" v${attestation.eip712.domain.version}, primaryType ${attestation.eip712.primaryType}`
        );
      } else {
        lines.push('- Attestation: not signed (no attester key configured)');
      }
      lines.push('', RIGHTS_NOTICE);
      return lines.join('\n');
    }

    const packs = await listEvidencePacks(args.limit ?? 20);
    if (packs.length === 0) {
      return 'No settlement-evidence packs yet. Packs appear after watched markets resolve.';
    }
    const byGrade = packs.reduce<Record<string, number>>((acc, pack) => {
      acc[pack.grade] = (acc[pack.grade] ?? 0) + 1;
      return acc;
    }, {});
    const lines = [
      `**Recent settlement evidence (${packs.length} packs, showing latest first)**`,
      `- By grade: ${Object.entries(byGrade)
        .map(([grade, count]) => `${grade} ${count}`)
        .join(', ')}`,
      '',
    ];
    for (const pack of packs) {
      const p = pack.payload;
      lines.push(
        `- [${pack.grade.toUpperCase()}] ${p.marketSlug} — declared ${p.declaredOutcome ?? 'n/a'} vs independent ${p.independentOutcome ?? 'n/a'}, ${p.priceChangeBps ?? 'n/a'} bps, attested: ${pack.attestation ? 'yes' : 'no'}`
      );
    }
    lines.push('', RIGHTS_NOTICE);
    return lines.join('\n');
  },
};
