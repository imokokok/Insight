import { type SupabaseClient } from '@supabase/supabase-js';

import {
  DatabaseQueries,
  createQueries,
  type PriceRecord,
  type PriceRecordInsert,
  type UserProfile,
  type PriceRecordsFilters,
} from '../queries';

jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/utils/requestQueue', () => ({
  // NOTE: `add` is a plain method (not jest.fn) so that `resetMocks: true`
  // in jest.config.js does not strip its implementation between tests.
  RequestQueue: class {
    add(fn: () => Promise<unknown>) {
      return fn();
    }
  },
}));

type MockQuery = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  upsert: jest.Mock;
  _resolveWith: (value: unknown) => void;
};

const createMockQuery = (): MockQuery => {
  let resolvePromise: (value: unknown) => void;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const query: MockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    upsert: jest.fn().mockReturnThis(),
    _resolveWith: (value: unknown) => resolvePromise(value),
  };

  Object.assign(query, {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  });

  return query;
};

const createMockClient = (): { client: jest.Mocked<SupabaseClient>; query: MockQuery } => {
  const query = createMockQuery();
  const client = {
    from: jest.fn().mockReturnValue(query),
    rpc: jest.fn(),
  } as unknown as jest.Mocked<SupabaseClient>;
  return { client, query };
};

let mockClient: jest.Mocked<SupabaseClient>;
let mockQuery: MockQuery;
let queries: DatabaseQueries;

beforeEach(() => {
  const mock = createMockClient();
  mockClient = mock.client;
  mockQuery = mock.query;
  queries = new DatabaseQueries(mockClient);
  jest.clearAllMocks();
});

describe('createQueries', () => {
  it('should create a DatabaseQueries instance', () => {
    const instance = createQueries(mockClient);
    expect(instance).toBeInstanceOf(DatabaseQueries);
  });
});

describe('savePriceRecord', () => {
  it('should save a price record and return the data', async () => {
    const mockData: PriceRecord = {
      id: 'test-id',
      provider: 'chainlink',
      symbol: 'BTC',
      chain: 'ethereum',
      price: 50000,
      timestamp: '2024-01-01T00:00:00Z',
      confidence: 0.99,
      source: 'test',
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const record: PriceRecordInsert = {
      provider: 'chainlink',
      symbol: 'BTC',
      chain: 'ethereum',
      price: 50000,
      timestamp: Date.now(),
      confidence: 0.99,
      source: 'test',
    };

    const result = await queries.savePriceRecord(record);

    expect(mockClient.from).toHaveBeenCalledWith('price_records');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const record: PriceRecordInsert = {
      provider: 'chainlink',
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
    };

    const result = await queries.savePriceRecord(record);

    expect(result).toBeNull();
  });
});

describe('getLatestPrice', () => {
  it('should get the latest price for a provider and symbol', async () => {
    const mockData: PriceRecord = {
      id: 'test-id',
      provider: 'chainlink',
      symbol: 'BTC',
      price: 50000,
      timestamp: '2024-01-01T00:00:00Z',
    };

    mockQuery.maybeSingle.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getLatestPrice('chainlink', 'BTC');

    expect(mockClient.from).toHaveBeenCalledWith('price_records');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await queries.getLatestPrice('chainlink', 'BTC');

    expect(result).toBeNull();
  });
});

describe('getPriceRecords', () => {
  it('should get price records with filters', async () => {
    const mockData: PriceRecord[] = [
      {
        id: 'test-id',
        provider: 'chainlink',
        symbol: 'BTC',
        price: 50000,
        timestamp: '2024-01-01T00:00:00Z',
      },
    ];

    mockQuery._resolveWith({ data: mockData, error: null });

    const filters: PriceRecordsFilters = {
      provider: 'chainlink',
      symbol: 'BTC',
      chain: 'ethereum',
      startTime: Date.now() - 86400000,
      endTime: Date.now(),
      limit: 10,
      offset: 0,
    };

    const result = await queries.getPriceRecords(filters);

    expect(mockClient.from).toHaveBeenCalledWith('price_records');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery._resolveWith({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await queries.getPriceRecords({});

    expect(result).toBeNull();
  });
});

describe('User Profile operations - getUserProfile', () => {
  it('should get a user profile', async () => {
    const mockData: UserProfile = {
      id: 'user-id',
      email: 'test@example.com',
      display_name: 'Test User',
      preferences: {
        defaultSymbol: 'BTC',
      },
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getUserProfile('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
    expect(result).toEqual(mockData);
  });

  it('should return null for PGRST116 error (not found)', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const result = await queries.getUserProfile('non-existent');

    expect(result).toBeNull();
  });
});

describe('User Profile operations - upsertUserProfile', () => {
  it('should upsert a user profile', async () => {
    const mockData: UserProfile = {
      id: 'user-id',
      display_name: 'Upserted User',
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.upsertUserProfile('user-id', {
      display_name: 'Upserted User',
    });

    expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await queries.upsertUserProfile('user-id', {});

    expect(result).toBeNull();
  });
});

describe('getOracleFeeds paging', () => {
  // A thenable that also chains `.eq()` (mirrors the PostgREST builder: the
  // resolver calls `.range()` then `.eq()` on the returned object).
  const createPageThenable = (value: unknown) => {
    const promise = new Promise((resolve) => resolve(value));
    const thenable = {
      eq: jest.fn().mockReturnThis(),
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
      finally: promise.finally.bind(promise),
    };
    return thenable;
  };

  const makeFeeds = (count: number, provider = 'redstone') =>
    Array.from({ length: count }, (_, i) => ({
      provider,
      symbol: `SYM${i}`,
      chain_id: 0,
      is_active: true,
    }));

  // Drive the paging loop: each `.range()` call resolves with the next page.
  const mockRangePages = (
    pages: Array<{ data: unknown[]; error: unknown; count: number | null }>
  ) => {
    let i = 0;
    mockQuery.range.mockImplementation(() =>
      createPageThenable(pages[i++] ?? { data: [], error: null, count: null })
    );
  };

  it('returns all rows when the registry fits in one page', async () => {
    const feeds = makeFeeds(3);
    mockRangePages([{ data: feeds, error: null, count: 3 }]);

    const result = await queries.getOracleFeeds('redstone');

    expect(result).toHaveLength(3);
    expect(mockClient.from).toHaveBeenCalledWith('oracle_feeds');
    expect(mockQuery.range).toHaveBeenCalledWith(0, 499);
  });

  it('pages through a registry larger than one page and reconciles the exact count', async () => {
    mockRangePages([
      { data: makeFeeds(500), error: null, count: 700 },
      { data: makeFeeds(200), error: null, count: 700 },
    ]);

    const result = await queries.getOracleFeeds('redstone');

    expect(result).toHaveLength(700);
    expect(mockQuery.range).toHaveBeenCalledTimes(2);
  });

  it('fails closed (returns []) when a later page errors instead of a truncated registry', async () => {
    mockRangePages([
      { data: makeFeeds(500), error: null, count: 700 },
      { data: [], error: { message: 'boom' }, count: 700 },
    ]);

    const result = await queries.getOracleFeeds('redstone');

    expect(result).toEqual([]);
  });

  it('fails closed when the exact count does not match the loaded rows (server-side truncation)', async () => {
    // A server cap below the page size clamps the first page short, so the
    // loop ends early; only the exact count reveals the missing rows.
    mockRangePages([{ data: makeFeeds(300), error: null, count: 700 }]);

    const result = await queries.getOracleFeeds('redstone');

    expect(result).toEqual([]);
  });
});
