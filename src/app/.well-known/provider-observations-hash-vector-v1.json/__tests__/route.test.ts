import publishedVector from '@/../scripts/veritas-joint-run/provider-observation-hash-vector-v1.json';

describe('.well-known provider-observations-hash vector', () => {
  it('serves the literal N15 vector without authentication', async () => {
    const { GET } = await import('../route');
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(await response.json()).toEqual(publishedVector);
  });
});
