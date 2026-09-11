import {
  EXECUTION_PROFILE_V1_ID,
  EXECUTION_PROFILE_V1_BODY,
} from '@/lib/attestations/executionProfiles';
import {
  CURRENT_ORACLE_REGISTRY_RELEASE,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID,
} from '@/lib/attestations/oracleRegistryRelease';
import { computeReasonCodesHash } from '@/lib/attestations/reasonCodesHash';
import {
  CURRENT_MAINLINE_PROTOCOL_PROMOTION,
  CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID,
} from '@/lib/protocol/mainlinePromotionRegistry';
import {
  CURRENT_PARTNER_ACTIVATION_SET,
  CURRENT_PARTNER_ACTIVATION_SET_ID,
  activePartnerIntegrationPolicy,
} from '@/lib/protocol/partnerIntegrationRegistry';

describe('content-addressed oracle registry routes', () => {
  it('serves an immutable semantic profile at the id signed into v5 receipts', async () => {
    const { GET } = await import('../profiles/[profileId]/route');
    const response = await GET(new Request('https://www.oracleinsight.xyz/profile') as never, {
      params: Promise.resolve({ profileId: EXECUTION_PROFILE_V1_ID }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(body.profileId).toBe(EXECUTION_PROFILE_V1_ID);
    expect(body.profile).toEqual(EXECUTION_PROFILE_V1_BODY);
    expect(body.profile.commitments.preTradeUidsHash.inclusion).toContain('omit');
    expect(body.profile.commitments.reasonCodesHash.encoding).toBe(
      'ABI encode the sorted values as string[]'
    );

    const { encodeAbiParameters, keccak256 } = await import('viem');
    const expectedReasonHash = keccak256(encodeAbiParameters([{ type: 'string[]' }], [['A', 'B']]));
    expect(computeReasonCodesHash(['B', 'A', 'A'])).toBe(expectedReasonHash);
  });

  it('serves the current immutable release and a small mutable pointer', async () => {
    const releaseRoute = await import('../releases/[releaseId]/route');
    const releaseResponse = await releaseRoute.GET(
      new Request('https://www.oracleinsight.xyz/release') as never,
      { params: Promise.resolve({ releaseId: CURRENT_ORACLE_REGISTRY_RELEASE_ID }) }
    );
    const releaseBody = await releaseResponse.json();

    expect(releaseResponse.status).toBe(200);
    expect(releaseResponse.headers.get('Cache-Control')).toContain('immutable');
    expect(releaseBody.releaseId).toBe(CURRENT_ORACLE_REGISTRY_RELEASE_ID);
    expect(releaseBody.release).toEqual(CURRENT_ORACLE_REGISTRY_RELEASE);

    const currentRoute = await import('../current.json/route');
    const currentResponse = await currentRoute.GET(
      new Request('https://www.oracleinsight.xyz/.well-known/oracle-registry/current.json') as never
    );
    const currentBody = await currentResponse.json();
    expect(currentBody.releaseId).toBe(CURRENT_ORACLE_REGISTRY_RELEASE_ID);
    expect(currentBody.registryRevision).toBe(CURRENT_ORACLE_REGISTRY_RELEASE.registryRevision);
    expect(currentBody.partnerIntegrations.activationSetId).toBe(CURRENT_PARTNER_ACTIVATION_SET_ID);
    expect(currentBody.partnerIntegrations.runtime.registryReleasePinRule).toBe(
      'lineage-floor-any'
    );
    expect(currentBody.promotion).toEqual(
      expect.objectContaining({
        promotionId: CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID,
        promotionVersion: CURRENT_MAINLINE_PROTOCOL_PROMOTION.promotionVersion,
      })
    );
    expect(releaseBody.release.executionReceipt.legacyProfileResolution).toEqual(
      expect.objectContaining({
        signingStatus: 'retired',
        productionAdmission: 'forbidden',
        resultScope: 'relative-to-exact-registry-snapshot',
        globallyCanonicalVerdict: false,
      })
    );
    expect(releaseBody.release.executionReceipt.legacyProfileResolution.requiredEvidence).toEqual([
      'registrySnapshotUtf8Bytes',
      'sha256',
      'byteLength',
    ]);
  });

  it('serves an immutable activation set and independently addressable partner policy', async () => {
    const currentRoute = await import('../integrations/current.json/route');
    const currentResponse = await currentRoute.GET(
      new Request(
        'https://www.oracleinsight.xyz/.well-known/oracle-registry/integrations/current.json'
      ) as never
    );
    const currentBody = await currentResponse.json();
    expect(currentBody.activationSetId).toBe(CURRENT_PARTNER_ACTIVATION_SET_ID);
    expect(currentBody.runtime.requiredBodyField).toBe('policyId');
    expect(currentBody.registryReleasePolicy.rule).toBe('lineage-floor-any');
    expect(currentBody.runtime.executionVerifyTemplate).toContain(
      '/api/v1/partners/{partnerId}/execution/attestation/verify'
    );

    const setRoute = await import('../integration-sets/[activationSetId]/route');
    const setResponse = await setRoute.GET(new Request('https://example.test/set') as never, {
      params: Promise.resolve({ activationSetId: CURRENT_PARTNER_ACTIVATION_SET_ID }),
    });
    const setBody = await setResponse.json();
    expect(setResponse.headers.get('Cache-Control')).toContain('immutable');
    expect(setBody.activationSet).toEqual(CURRENT_PARTNER_ACTIVATION_SET);

    const headless = activePartnerIntegrationPolicy('headless')!;
    const policyRoute = await import('../integrations/[policyId]/route');
    const policyResponse = await policyRoute.GET(
      new Request('https://example.test/policy') as never,
      {
        params: Promise.resolve({ policyId: headless.policyId }),
      }
    );
    const policyBody = await policyResponse.json();
    expect(policyResponse.headers.get('Cache-Control')).toContain('immutable');
    expect(policyBody.policy).toEqual(headless);
  });

  it('serves immutable content-addressed promotion records', async () => {
    const promotionRoute = await import('../promotions/[promotionId]/route');
    const response = await promotionRoute.GET(
      new Request('https://example.test/promotion') as never,
      {
        params: Promise.resolve({ promotionId: CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID }),
      }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('immutable');
    expect(body.promotionId).toBe(CURRENT_MAINLINE_PROTOCOL_PROMOTION_ID);
    expect(body.promotion).toEqual(CURRENT_MAINLINE_PROTOCOL_PROMOTION);

    const unknown = await promotionRoute.GET(
      new Request('https://example.test/promotion') as never,
      { params: Promise.resolve({ promotionId: `0x${'f'.repeat(64)}` }) }
    );
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get('Cache-Control')).toBe('no-store');
  });

  it('does not alias an unknown id to current content', async () => {
    const { GET } = await import('../profiles/[profileId]/route');
    const unknown = `0x${'f'.repeat(64)}`;
    const response = await GET(new Request('https://www.oracleinsight.xyz/profile') as never, {
      params: Promise.resolve({ profileId: unknown }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');

    const policyRoute = await import('../integrations/[policyId]/route');
    const policyResponse = await policyRoute.GET(
      new Request('https://www.oracleinsight.xyz/policy') as never,
      { params: Promise.resolve({ policyId: unknown }) }
    );
    expect(policyResponse.status).toBe(404);
    expect(policyResponse.headers.get('Cache-Control')).toBe('no-store');
  });
});
