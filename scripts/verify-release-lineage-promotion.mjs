import canonicalize from 'canonicalize';
import { keccak256, toBytes } from 'viem';

const {
  CURRENT_ORACLE_REGISTRY_RELEASE,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID,
} = await import('../src/lib/attestations/oracleRegistryRelease.ts');
const { CURRENT_MAINLINE_PROTOCOL_PROMOTION, CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID } =
  await import('../src/lib/protocol/mainlinePromotionRegistry.ts');
const { activePartnerIntegrationPolicy } =
  await import('../src/lib/protocol/partnerIntegrationRegistry.ts');
const { evaluateExecutionPolicyForRegistryRelease } =
  await import('../src/lib/protocol/registryReleasePolicy.ts');
const { EXECUTION_PROFILE_V1_ID } = await import('../src/lib/attestations/executionProfiles.ts');

function contentId(value) {
  const bytes = canonicalize(value);
  if (bytes === undefined) throw new Error('Value is not JSON-canonicalizable');
  return { id: keccak256(toBytes(bytes)), bytes };
}

function withoutId(value, key) {
  const copy = { ...value };
  delete copy[key];
  return copy;
}

const release = contentId(CURRENT_ORACLE_REGISTRY_RELEASE);
if (release.id !== CURRENT_ORACLE_REGISTRY_RELEASE_ID) {
  throw new Error(`Release content id mismatch: ${release.id}`);
}
const releaseControl = contentId({
  ...CURRENT_ORACLE_REGISTRY_RELEASE,
  effectiveFrom: `${CURRENT_ORACLE_REGISTRY_RELEASE.effectiveFrom}!`,
});
if (releaseControl.id === release.id) throw new Error('Release mutation control did not move id');

const promotionBody = withoutId(CURRENT_MAINLINE_PROTOCOL_PROMOTION, 'promotionId');
const promotion = contentId(promotionBody);
if (promotion.id !== CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID) {
  throw new Error(`Promotion content id mismatch: ${promotion.id}`);
}
const promotionControl = contentId({ ...promotionBody, classification: '!' });
if (promotionControl.id === promotion.id) {
  throw new Error('Promotion mutation control did not move id');
}

const headless = activePartnerIntegrationPolicy('headless');
if (!headless) throw new Error('Headless policy is unavailable');
const admitted = evaluateExecutionPolicyForRegistryRelease(
  headless.policyId,
  5,
  EXECUTION_PROFILE_V1_ID,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID
);
if (
  !admitted.valid ||
  admitted.registryReleaseMatchedFloor !== ORACLE_REGISTRY_RELEASE_2026_09_09_1_ID
) {
  throw new Error(
    `Current release did not satisfy the Headless floor: ${JSON.stringify(admitted)}`
  );
}

const tooOld = evaluateExecutionPolicyForRegistryRelease(
  headless.policyId,
  5,
  EXECUTION_PROFILE_V1_ID,
  ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID
);
if (tooOld.valid || tooOld.reason !== 'registry_release_not_admitted_by_policy') {
  throw new Error(`Pre-floor release was not rejected: ${JSON.stringify(tooOld)}`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      result: 'PASS',
      registryReleasePinRule: admitted.registryReleasePinRule,
      release: {
        id: release.id,
        canonicalBytes: Buffer.byteLength(release.bytes),
        predecessorReleaseId: ORACLE_REGISTRY_RELEASE_2026_09_10_1_ID,
        matchedFloor: admitted.registryReleaseMatchedFloor,
        oneByteControlId: releaseControl.id,
      },
      promotion: {
        id: promotion.id,
        canonicalBytes: Buffer.byteLength(promotion.bytes),
        oneByteControlId: promotionControl.id,
      },
      preFloorControl: {
        releaseId: ORACLE_REGISTRY_RELEASE_2026_09_08_1_ID,
        valid: tooOld.valid,
        reason: tooOld.reason,
      },
    },
    null,
    2
  )}\n`
);
