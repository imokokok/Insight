import {
  EXECUTION_PROFILE_V1_ID,
  EXECUTION_PROFILE_V1_BODY,
} from '@/lib/attestations/executionProfiles';
import {
  CURRENT_ORACLE_REGISTRY_RELEASE,
  CURRENT_ORACLE_REGISTRY_RELEASE_ID,
} from '@/lib/attestations/oracleRegistryRelease';
import { computeReasonCodesHash } from '@/lib/attestations/reasonCodesHash';

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
  });

  it('does not alias an unknown id to current content', async () => {
    const { GET } = await import('../profiles/[profileId]/route');
    const unknown = `0x${'f'.repeat(64)}`;
    const response = await GET(new Request('https://www.oracleinsight.xyz/profile') as never, {
      params: Promise.resolve({ profileId: unknown }),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });
});
