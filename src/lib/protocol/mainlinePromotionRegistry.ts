import currentPromotionPointerJson from '../../../protocol/mainline/current-promotion.json';
import promotionV1Json from '../../../protocol/mainline/promotions/2026-09-09-main-only-isolation.json';
import promotionV2Json from '../../../protocol/mainline/promotions/2026-09-09-runtime-and-deploy-gates.json';
import promotionV3Json from '../../../protocol/mainline/promotions/2026-09-10-headless-v5-only.json';
import promotionV4Json from '../../../protocol/mainline/promotions/2026-09-11-release-lineage-and-addressing.json';

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
