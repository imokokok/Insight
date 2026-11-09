import { GET } from '../route';

function invoke(url = 'https://example.test/api/v1/health/ready') {
  return GET(
    {
      method: 'GET',
      headers: new Headers(),
      nextUrl: new URL(url),
      body: null,
    } as never,
    { params: Promise.resolve({}) }
  );
}

describe('ready health endpoint', () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('returns constant public liveness without invoking dependency probes', async () => {
    const response = await invoke();

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ status: 'live' });
  });

  it('requires the cron secret before running a deep readiness probe', async () => {
    process.env.CRON_SECRET = 'test-cron-secret';
    const response = await invoke('https://example.test/api/v1/health/ready?deep=1');

    expect(response.status).toBe(401);
  });
});
