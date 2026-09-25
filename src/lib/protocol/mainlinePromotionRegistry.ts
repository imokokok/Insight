import currentPromotionPointerJson from '../../../protocol/mainline/current-promotion.json';
import promotionV1Json from '../../../protocol/mainline/promotions/2026-09-09-main-only-isolation.json';
import promotionV2Json from '../../../protocol/mainline/promotions/2026-09-09-runtime-and-deploy-gates.json';
import promotionV3Json from '../../../protocol/mainline/promotions/2026-09-10-headless-v5-only.json';
import promotionV4Json from '../../../protocol/mainline/promotions/2026-09-11-release-lineage-and-addressing.json';
import promotionV5Json from '../../../protocol/mainline/promotions/2026-09-13-agent-api-fail-closed-hardening.json';
import promotionV6Json from '../../../protocol/mainline/promotions/2026-09-13-credential-billing-ops-hardening.json';
import promotionV7Json from '../../../protocol/mainline/promotions/2026-09-17-legacy-v1-v4-scope-clarification.json';
import promotionV8Json from '../../../protocol/mainline/promotions/2026-09-19-workflow-evidence-polish.json';
import promotionV9Json from '../../../protocol/mainline/promotions/2026-09-20-coverage-readiness.json';
import promotionV10Json from '../../../protocol/mainline/promotions/2026-09-20-rwa-adaptation.json';
import promotionV11Json from '../../../protocol/mainline/promotions/2026-09-20-rwa-hardening.json';
import promotionV13Json from '../../../protocol/mainline/promotions/2026-09-21-band-v3-oracle.json';
import promotionV14Json from '../../../protocol/mainline/promotions/2026-09-21-band-v3-runtime-publication.json';
import promotionV12Json from '../../../protocol/mainline/promotions/2026-09-21-robinhood-issuer-context.json';
import promotionV15Json from '../../../protocol/mainline/promotions/2026-09-21-rwa-instrument-identity.json';
import promotionV16Json from '../../../protocol/mainline/promotions/2026-09-23-veritas-v5-remediation-candidate.json';
import promotionV18Json from '../../../protocol/mainline/promotions/2026-09-25-veritas-selected-event-receipt-correction.json';
import promotionV17Json from '../../../protocol/mainline/promotions/2026-09-25-veritas-v5-activation.json';

import { bodyWithoutId, keccakContentId } from './contentAddress';

import type { PartnerId } from './partnerIntegrationRegistry';

export interface MainlineProtocolPromotion {
  promotionId: `0x${string}`;
  kind: 'MainlineProtocolPromotion';
  promotionVersion: number;
  effectiveFrom: string;
  classification: string;
  registryReleaseId: `0x${string}`;
  predecessorReleaseId: `0x${string}`;
  predecessorPromotionId?: `0x${string}` | null;
  activationSetId: `0x${string}`;
  receiptImpact: string;
  activationRule: string;
  compatibilityMatrix: Array<{
    partnerId: PartnerId;
    outcome: string;
    evidence: string;
  }>;
}

interface MainlinePromotionPointer {
  promotionId: `0x${string}`;
  path: string;
}

const rawPromotions = [
  promotionV1Json,
  promotionV2Json,
  promotionV3Json,
  promotionV4Json,
  promotionV5Json,
  promotionV6Json,
  promotionV7Json,
  promotionV8Json,
  promotionV9Json,
  promotionV10Json,
  promotionV11Json,
  promotionV12Json,
  promotionV13Json,
  promotionV14Json,
  promotionV15Json,
  promotionV16Json,
  promotionV17Json,
  promotionV18Json,
] as unknown as MainlineProtocolPromotion[];

for (const promotion of rawPromotions) {
  const expected = keccakContentId(bodyWithoutId(promotion, 'promotionId'));
  if (promotion.promotionId !== expected) {
    throw new Error(
      `Mainline promotion is immutable: expected ${promotion.promotionId}, computed ${expected}`
    );
  }
}

export const MAINLINE_PROTOCOL_PROMOTIONS = Object.freeze(
  Object.fromEntries(
    rawPromotions.map((promotion) => [promotion.promotionId, Object.freeze(promotion)])
  ) as Record<`0x${string}`, Readonly<MainlineProtocolPromotion>>
);

const currentPromotionPointer = currentPromotionPointerJson as MainlinePromotionPointer;

export const CURRENT_MAINLINE_PROTOCOL_PROMOTION =
  MAINLINE_PROTOCOL_PROMOTIONS[currentPromotionPointer.promotionId];
if (!CURRENT_MAINLINE_PROTOCOL_PROMOTION) {
  throw new Error(`Unknown current mainline promotion ${currentPromotionPointer.promotionId}`);
}

export const CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID =
  CURRENT_MAINLINE_PROTOCOL_PROMOTION.promotionId;

export function mainlineProtocolPromotionById(promotionId: string) {
  return (
    MAINLINE_PROTOCOL_PROMOTIONS[
      promotionId.toLowerCase() as keyof typeof MAINLINE_PROTOCOL_PROMOTIONS
    ] ?? null
  );
}
