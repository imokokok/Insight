import { type SupabaseClient } from '@supabase/supabase-js';

import {
  DatabaseQueries,
  createQueries,
  type PriceRecord,
  type PriceRecordInsert,
  type UserSnapshot,
  type UserSnapshotInsert,
  type UserProfile,
  type PriceRecordsFilters,
} from '../queries';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/utils/requestQueue', () => ({
  RequestQueue: class {
    add = jest.fn((fn: () => Promise<unknown>) => fn());
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

describe('Snapshot operations - saveSnapshot', () => {
  it('should save a snapshot and return the data', async () => {
    const mockData: UserSnapshot = {
      id: 'snapshot-id',
      user_id: 'user-id',
      symbol: 'BTC',
      selected_oracles: ['chainlink', 'pyth'],
      price_data: [],
      stats: {
        avgPrice: 50000,
        weightedAvgPrice: 50000,
        maxPrice: 51000,
        minPrice: 49000,
        priceRange: 2000,
        variance: 1000,
        standardDeviation: 31.62,
        standardDeviationPercent: 0.06,
      },
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const snapshot: Omit<UserSnapshotInsert, 'user_id'> = {
      symbol: 'BTC',
      selected_oracles: ['chainlink', 'pyth'],
      price_data: [],
      stats: {
        avgPrice: 50000,
        weightedAvgPrice: 50000,
        maxPrice: 51000,
        minPrice: 49000,
        priceRange: 2000,
        variance: 1000,
        standardDeviation: 31.62,
        standardDeviationPercent: 0.06,
      },
    };

    const result = await queries.saveSnapshot('user-id', snapshot);

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const snapshot: Omit<UserSnapshotInsert, 'user_id'> = {
      symbol: 'BTC',
      selected_oracles: ['chainlink'],
      price_data: [],
      stats: {
        avgPrice: 50000,
        weightedAvgPrice: 50000,
        maxPrice: 51000,
        minPrice: 49000,
        priceRange: 2000,
        variance: 1000,
        standardDeviation: 31.62,
        standardDeviationPercent: 0.06,
      },
    };

    const result = await queries.saveSnapshot('user-id', snapshot);

    expect(result).toBeNull();
  });
});

describe('Snapshot operations - getSnapshots', () => {
  it('should get all snapshots for a user', async () => {
    const mockData: UserSnapshot[] = [
      {
        id: 'snapshot-1',
        user_id: 'user-id',
        symbol: 'BTC',
        selected_oracles: ['chainlink'],
        price_data: [],
        stats: {
          avgPrice: 50000,
          weightedAvgPrice: 50000,
          maxPrice: 51000,
          minPrice: 49000,
          priceRange: 2000,
          variance: 1000,
          standardDeviation: 31.62,
          standardDeviationPercent: 0.06,
        },
      },
    ];

    mockQuery.order.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getSnapshots('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.order.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await queries.getSnapshots('user-id');

    expect(result).toBeNull();
  });
});

describe('Snapshot operations - getSnapshotById', () => {
  it('should get a snapshot by id', async () => {
    const mockData: UserSnapshot = {
      id: 'snapshot-id',
      user_id: 'user-id',
      symbol: 'BTC',
      selected_oracles: ['chainlink'],
      price_data: [],
      stats: {
        avgPrice: 50000,
        weightedAvgPrice: 50000,
        maxPrice: 51000,
        minPrice: 49000,
        priceRange: 2000,
        variance: 1000,
        standardDeviation: 31.62,
        standardDeviationPercent: 0.06,
      },
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getSnapshotById('snapshot-id', 'user-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toEqual(mockData);
  });

  it('should return null for PGRST116 error (not found)', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const result = await queries.getSnapshotById('non-existent', 'user-id');

    expect(result).toBeNull();
  });
});

describe('Snapshot operations - updateSnapshot', () => {
  it('should update a snapshot', async () => {
    const mockData: UserSnapshot = {
      id: 'snapshot-id',
      user_id: 'user-id',
      symbol: 'ETH',
      selected_oracles: ['chainlink'],
      price_data: [],
      stats: {
        avgPrice: 3000,
        weightedAvgPrice: 3000,
        maxPrice: 3100,
        minPrice: 2900,
        priceRange: 200,
        variance: 100,
        standardDeviation: 10,
        standardDeviationPercent: 0.03,
      },
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.updateSnapshot('snapshot-id', { symbol: 'ETH' });

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await queries.updateSnapshot('snapshot-id', { symbol: 'ETH' });

    expect(result).toBeNull();
  });
});

describe('Snapshot operations - deleteSnapshot', () => {
  it('should delete a snapshot and return true', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const result = await queries.deleteSnapshot('snapshot-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toBe(true);
  });

  it('should return false on error', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: { message: 'Database error' } });

    const result = await queries.deleteSnapshot('snapshot-id');

    expect(result).toBe(false);
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

describe('deleteAllSnapshots', () => {
  it('should delete all snapshots for a user', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const result = await queries.deleteAllSnapshots('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toBe(true);
  });

  it('should return false on error', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: { message: 'Database error' } });

    const result = await queries.deleteAllSnapshots('user-id');

    expect(result).toBe(false);
  });
});
