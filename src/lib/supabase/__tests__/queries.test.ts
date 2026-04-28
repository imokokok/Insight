import { type SupabaseClient } from '@supabase/supabase-js';

import {
  DatabaseQueries,
  createQueries,
  type PriceRecord,
  type PriceRecordInsert,
  type UserSnapshot,
  type UserSnapshotInsert,
  type UserFavorite,
  type UserFavoriteInsert,
  type PriceAlert,
  type PriceAlertInsert,
  type AlertEvent,
  type AlertEventInsert,
  type UserProfile,
  type UserProfileUpdate,
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

    const result = await queries.getSnapshotById('snapshot-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_snapshots');
    expect(result).toEqual(mockData);
  });

  it('should return null for PGRST116 error (not found)', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const result = await queries.getSnapshotById('non-existent');

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

describe('Favorite operations - addFavorite', () => {
  it('should add a favorite and return the data', async () => {
    const mockData: UserFavorite = {
      id: 'favorite-id',
      user_id: 'user-id',
      name: 'My Config',
      config_type: 'oracle_config',
      config_data: { providers: ['chainlink'] },
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const favorite: Omit<UserFavoriteInsert, 'user_id'> = {
      name: 'My Config',
      config_type: 'oracle_config',
      config_data: { providers: ['chainlink'] },
    };

    const result = await queries.addFavorite('user-id', favorite);

    expect(mockClient.from).toHaveBeenCalledWith('user_favorites');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const favorite: Omit<UserFavoriteInsert, 'user_id'> = {
      name: 'My Config',
      config_type: 'oracle_config',
      config_data: {},
    };

    const result = await queries.addFavorite('user-id', favorite);

    expect(result).toBeNull();
  });
});

describe('Favorite operations - getFavorites', () => {
  it('should get all favorites for a user', async () => {
    const mockData: UserFavorite[] = [
      {
        id: 'favorite-1',
        user_id: 'user-id',
        name: 'Config 1',
        config_type: 'oracle_config',
        config_data: {},
      },
    ];

    mockQuery.order.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getFavorites('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_favorites');
    expect(result).toEqual(mockData);
  });
});

describe('Favorite operations - getFavoritesByType', () => {
  it('should get favorites by type', async () => {
    const mockData: UserFavorite[] = [
      {
        id: 'favorite-1',
        user_id: 'user-id',
        name: 'Config 1',
        config_type: 'oracle_config',
        config_data: {},
      },
    ];

    mockQuery.order.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getFavoritesByType('user-id', 'oracle_config');

    expect(mockClient.from).toHaveBeenCalledWith('user_favorites');
    expect(result).toEqual(mockData);
  });
});

describe('Favorite operations - updateFavorite', () => {
  it('should update a favorite', async () => {
    const mockData: UserFavorite = {
      id: 'favorite-id',
      user_id: 'user-id',
      name: 'Updated Config',
      config_type: 'oracle_config',
      config_data: { providers: ['chainlink', 'pyth'] },
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.updateFavorite('favorite-id', {
      name: 'Updated Config',
    });

    expect(mockClient.from).toHaveBeenCalledWith('user_favorites');
    expect(result).toEqual(mockData);
  });
});

describe('Favorite operations - deleteFavorite', () => {
  it('should delete a favorite and return true', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const result = await queries.deleteFavorite('favorite-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_favorites');
    expect(result).toBe(true);
  });

  it('should return false on error', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: { message: 'Database error' } });

    const result = await queries.deleteFavorite('favorite-id');

    expect(result).toBe(false);
  });
});

describe('Favorite operations - deleteAllFavorites', () => {
  it('should delete all favorites for a user', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const result = await queries.deleteAllFavorites('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('user_favorites');
    expect(result).toBe(true);
  });
});

describe('Alert operations - createAlert', () => {
  it('should create an alert and return the data', async () => {
    const mockData: PriceAlert = {
      id: 'alert-id',
      user_id: 'user-id',
      name: 'BTC Alert',
      symbol: 'BTC',
      chain: null,
      condition_type: 'above',
      target_value: 60000,
      provider: null,
      is_active: true,
      last_triggered_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const alert: Omit<PriceAlertInsert, 'user_id'> = {
      name: 'BTC Alert',
      symbol: 'BTC',
      condition_type: 'above',
      target_value: 60000,
    };

    const result = await queries.createAlert('user-id', alert);

    expect(mockClient.from).toHaveBeenCalledWith('price_alerts');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const alert: Omit<PriceAlertInsert, 'user_id'> = {
      symbol: 'BTC',
      condition_type: 'above',
      target_value: 60000,
    };

    const result = await queries.createAlert('user-id', alert);

    expect(result).toBeNull();
  });
});

describe('Alert operations - getAlerts', () => {
  it('should get all alerts for a user', async () => {
    const mockData: PriceAlert[] = [
      {
        id: 'alert-1',
        user_id: 'user-id',
        name: 'BTC Alert',
        symbol: 'BTC',
        chain: null,
        condition_type: 'above',
        target_value: 60000,
        provider: null,
        is_active: true,
        last_triggered_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockQuery.order.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getAlerts('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('price_alerts');
    expect(result).toEqual(mockData);
  });
});

describe('Alert operations - getActiveAlerts', () => {
  it('should get all active alerts', async () => {
    const mockData: PriceAlert[] = [
      {
        id: 'alert-1',
        user_id: 'user-id',
        name: 'Active Alert',
        symbol: 'BTC',
        chain: null,
        condition_type: 'above',
        target_value: 60000,
        provider: null,
        is_active: true,
        last_triggered_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ];

    mockQuery.eq.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getActiveAlerts();

    expect(mockClient.from).toHaveBeenCalledWith('price_alerts');
    expect(result).toEqual(mockData);
  });
});

describe('Alert operations - updateAlert', () => {
  it('should update an alert', async () => {
    const mockData: PriceAlert = {
      id: 'alert-id',
      user_id: 'user-id',
      name: 'Updated Alert',
      symbol: 'BTC',
      chain: null,
      condition_type: 'above',
      target_value: 65000,
      provider: null,
      is_active: true,
      last_triggered_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.updateAlert('alert-id', { target_value: 65000 });

    expect(mockClient.from).toHaveBeenCalledWith('price_alerts');
    expect(result).toEqual(mockData);
  });
});

describe('Alert operations - deleteAlert', () => {
  it('should delete an alert and return true', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const result = await queries.deleteAlert('alert-id');

    expect(mockClient.from).toHaveBeenCalledWith('price_alerts');
    expect(result).toBe(true);
  });
});

describe('Alert operations - deleteAllAlerts', () => {
  it('should delete all alerts for a user', async () => {
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const result = await queries.deleteAllAlerts('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('price_alerts');
    expect(result).toBe(true);
  });
});

describe('Alert operations - triggerAlert', () => {
  it('should trigger an alert and create an event', async () => {
    const mockEvent: AlertEvent = {
      id: 'event-id',
      alert_id: 'alert-id',
      user_id: 'user-id',
      price: 61000,
      triggered_at: '2024-01-01T00:00:00Z',
      condition_met: 'above',
      acknowledged: false,
      acknowledged_at: null,
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockEvent, error: null });
    mockQuery.eq.mockResolvedValueOnce({ error: null });

    const eventData: Omit<AlertEventInsert, 'alert_id' | 'user_id'> = {
      price: 61000,
      triggered_at: '2024-01-01T00:00:00Z',
      condition_met: 'above',
    };

    const result = await queries.triggerAlert('alert-id', 'user-id', eventData);

    expect(mockClient.from).toHaveBeenCalledWith('alert_events');
    expect(result).toEqual(mockEvent);
  });

  it('should return null on event creation error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const eventData: Omit<AlertEventInsert, 'alert_id' | 'user_id'> = {
      price: 61000,
      triggered_at: '2024-01-01T00:00:00Z',
      condition_met: 'above',
    };

    const result = await queries.triggerAlert('alert-id', 'user-id', eventData);

    expect(result).toBeNull();
  });
});

describe('Alert operations - getAlertEvents', () => {
  it('should get all alert events for a user', async () => {
    const mockData: AlertEvent[] = [
      {
        id: 'event-1',
        alert_id: 'alert-id',
        user_id: 'user-id',
        price: 61000,
        triggered_at: '2024-01-01T00:00:00Z',
        condition_met: 'above',
        acknowledged: false,
        acknowledged_at: null,
      },
    ];

    mockQuery.order.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.getAlertEvents('user-id');

    expect(mockClient.from).toHaveBeenCalledWith('alert_events');
    expect(result).toEqual(mockData);
  });
});

describe('Alert operations - acknowledgeAlertEvent', () => {
  it('should acknowledge an alert event', async () => {
    const mockData: AlertEvent = {
      id: 'event-id',
      alert_id: 'alert-id',
      user_id: 'user-id',
      price: 61000,
      triggered_at: '2024-01-01T00:00:00Z',
      condition_met: 'above',
      acknowledged: true,
      acknowledged_at: '2024-01-01T00:01:00Z',
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const result = await queries.acknowledgeAlertEvent('event-id');

    expect(mockClient.from).toHaveBeenCalledWith('alert_events');
    expect(result).toEqual(mockData);
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

describe('User Profile operations - updateUserProfile', () => {
  it('should update a user profile', async () => {
    const mockData: UserProfile = {
      id: 'user-id',
      display_name: 'Updated User',
      preferences: {},
    };

    mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });

    const updateData: UserProfileUpdate = {
      display_name: 'Updated User',
    };

    const result = await queries.updateUserProfile('user-id', updateData);

    expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
    expect(result).toEqual(mockData);
  });

  it('should return null on error', async () => {
    mockQuery.single.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await queries.updateUserProfile('user-id', {});

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
