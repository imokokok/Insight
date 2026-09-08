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
