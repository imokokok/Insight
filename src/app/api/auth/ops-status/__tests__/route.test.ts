import { isOpsOwner } from '@/lib/ops/auth';

jest.mock('@/lib/api/handler', () => {
  const actual = jest.requireActual('@/lib/api/handler');
  return {
    ...actual,
    createApiHandler: (handler: unknown) => handler,
    ApiResponseBuilder: actual.ApiResponseBuilder,
  };
});

jest.mock('@/lib/ops/auth', () => ({
  isOpsOwner: jest.fn(),
}));

const mockedIsOpsOwner = isOpsOwner as jest.MockedFunction<typeof isOpsOwner>;

async function callGet(userId?: string): Promise<Response> {
  const { GET } = await import('../route');
  return GET(new Request('https://www.oracleinsight.xyz/api/auth/ops-status'), {
    requestId: 'test',
    auth: { userId },
  } as never);
}

describe('GET /api/auth/ops-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns only the owner boolean and disables caching', async () => {
    mockedIsOpsOwner.mockReturnValue(true);

    const response = await callGet('owner-1');

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    await expect(response.json()).resolves.toEqual({ isOpsOwner: true });
    expect(mockedIsOpsOwner).toHaveBeenCalledWith('owner-1');
  });

  it('fails closed without an authenticated user', async () => {
    const response = await callGet();

    expect(response.status).toBe(401);
    expect(mockedIsOpsOwner).not.toHaveBeenCalled();
  });
});
