import { PolymarketPositionsPageSchema, type PolymarketPosition } from './positions-schema';

const DATA_API_URL = 'https://data-api.polymarket.com/v2/positions';

export class PolymarketDataApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryAfter?: string
  ) {
    super(message);
    this.name = 'PolymarketDataApiError';
  }
}

export async function fetchPolymarketPositionsPage(
  address: string,
  cursor?: string,
  fetchImpl: typeof fetch = fetch
): Promise<{
  data: PolymarketPosition[];
  pagination: { has_more: boolean; next_cursor: string | null };
}> {
  const url = new URL(DATA_API_URL);
  url.searchParams.set('user', address);
  url.searchParams.set('status', 'OPEN');
  url.searchParams.set('filter_type', 'TOKENS');
  url.searchParams.set('filter_amount', '0');
  url.searchParams.set('sort_by', 'CURRENT_VALUE');
  url.searchParams.set('sort_direction', 'DESC');
  if (cursor) url.searchParams.set('cursor', cursor);

  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new PolymarketDataApiError(
      'The Polymarket positions service could not complete the request.',
      response.status,
      response.headers.get('retry-after') ?? undefined
    );
  }

  const payload: unknown = await response.json();
  const parsed = PolymarketPositionsPageSchema.safeParse(payload);
  if (!parsed.success) {
    throw new PolymarketDataApiError(
      'The Polymarket positions service returned an unexpected response.',
      502
    );
  }
  return {
    data: parsed.data.data.map((position) => ({
      title: position.title,
      outcome: position.outcome,
      current_size: position.current_size,
      avg_price: position.avg_price,
      current_value: position.current_value,
      unrealized_pnl: position.unrealized_pnl,
      redeemable: position.redeemable,
      condition_id: position.condition_id,
      token_id: position.token_id,
      event_slug: position.event_slug,
    })),
    pagination: {
      has_more: parsed.data.pagination.has_more,
      next_cursor: parsed.data.pagination.next_cursor,
    },
  };
}
