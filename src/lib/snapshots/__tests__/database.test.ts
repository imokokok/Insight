import {
  saveSnapshotToDatabase,
  getSnapshotsFromDatabase,
  getSnapshotById,
  getPublicSnapshot,
  updateSnapshot,
  deleteSnapshotFromDatabase,
  shareSnapshot,
  unshareSnapshot,
  getSnapshotShareStatus,
  type DatabaseSnapshot,
} from '../database';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

const createMockQuery = () => ({
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
});

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => createMockQuery()),
  },
}));

const mockSupabase = jest.requireMock('@/lib/supabase/client').supabase;

const createMockSnapshot = (overrides?: Partial<DatabaseSnapshot>): DatabaseSnapshot => ({
  id: 'snapshot-id',
  user_id: 'user-id',
  symbol: 'BTC',
  selected_oracles: ['chainlink', 'pyth'],
  price_data: [
    {
      provider: 'chainlink',
      symbol: 'BTC',
      price: 50000,
      timestamp: Date.now(),
      decimals: 8,
    },
  ],
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
  is_public: false,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('snapshot database operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveSnapshotToDatabase', () => {
    it('should save a snapshot and return the OracleSnapshot', async () => {
      const mockData = createMockSnapshot();
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const snapshot = {
        symbol: 'BTC',
        selectedOracles: ['chainlink', 'pyth'],
        priceData: mockData.price_data,
        stats: mockData.stats,
      };

      const result = await saveSnapshotToDatabase('user-id', snapshot);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('snapshot-id');
      expect(result?.symbol).toBe('BTC');
      expect(result?.selectedOracles).toEqual(['chainlink', 'pyth']);
    });

    it('should return null on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const snapshot = {
        symbol: 'BTC',
        selectedOracles: ['chainlink'],
        priceData: [],
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

      const result = await saveSnapshotToDatabase('user-id', snapshot);

      expect(result).toBeNull();
    });
  });

  describe('getSnapshotsFromDatabase', () => {
    it('should get all snapshots for a user', async () => {
      const mockData = [createMockSnapshot(), createMockSnapshot({ id: 'snapshot-2' })];
      const mockQuery = createMockQuery();
      mockQuery.select.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotsFromDatabase('user-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('snapshot-id');
    });

    it('should return empty array on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.select.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotsFromDatabase('user-id');

      expect(result).toEqual([]);
    });
  });

  describe('getSnapshotById', () => {
    it('should get a snapshot by id', async () => {
      const mockData = createMockSnapshot();
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotById('snapshot-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('snapshot-id');
    });

    it('should return null for PGRST116 error (not found)', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotById('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on other errors', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotById('snapshot-id');

      expect(result).toBeNull();
    });
  });

  describe('getPublicSnapshot', () => {
    it('should get a public snapshot by id', async () => {
      const mockData = createMockSnapshot({ is_public: true });
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getPublicSnapshot('snapshot-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('snapshot-id');
    });

    it('should return null for PGRST116 error (not found)', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { code: 'PGRST116' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getPublicSnapshot('non-existent');

      expect(result).toBeNull();
    });

    it('should return null on other errors', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getPublicSnapshot('snapshot-id');

      expect(result).toBeNull();
    });
  });

  describe('updateSnapshot', () => {
    it('should update a snapshot with selectedOracles', async () => {
      const mockData = createMockSnapshot({ selected_oracles: ['chainlink', 'pyth', 'api3'] });
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateSnapshot('snapshot-id', {
        selectedOracles: ['chainlink', 'pyth', 'api3'],
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).not.toBeNull();
    });

    it('should update a snapshot with priceData', async () => {
      const mockData = createMockSnapshot();
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateSnapshot('snapshot-id', {
        priceData: mockData.price_data,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).not.toBeNull();
    });

    it('should update a snapshot with other fields', async () => {
      const mockData = createMockSnapshot({ symbol: 'ETH' });
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateSnapshot('snapshot-id', {
        symbol: 'ETH',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).not.toBeNull();
    });

    it('should return null on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateSnapshot('snapshot-id', { symbol: 'ETH' });

      expect(result).toBeNull();
    });
  });

  describe('deleteSnapshotFromDatabase', () => {
    it('should delete a snapshot and return true', async () => {
      const mockQuery = createMockQuery();
      mockQuery.delete.mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await deleteSnapshotFromDatabase('snapshot-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.delete.mockResolvedValueOnce({ error: { message: 'Database error' } });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await deleteSnapshotFromDatabase('snapshot-id');

      expect(result).toBe(false);
    });
  });

  describe('shareSnapshot', () => {
    it('should share a snapshot and return the id', async () => {
      const mockData = createMockSnapshot({ is_public: true });
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({ data: mockData, error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await shareSnapshot('snapshot-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).toBe('snapshot-id');
    });

    it('should return null on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await shareSnapshot('snapshot-id');

      expect(result).toBeNull();
    });
  });

  describe('unshareSnapshot', () => {
    it('should unshare a snapshot and return true', async () => {
      const mockQuery = createMockQuery();
      mockQuery.update.mockResolvedValueOnce({ error: null });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await unshareSnapshot('snapshot-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.update.mockResolvedValueOnce({ error: { message: 'Database error' } });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await unshareSnapshot('snapshot-id');

      expect(result).toBe(false);
    });
  });

  describe('getSnapshotShareStatus', () => {
    it('should return true for public snapshot', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: { is_public: true },
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotShareStatus('snapshot-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('user_snapshots');
      expect(result).toBe(true);
    });

    it('should return false for private snapshot', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: { is_public: false },
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotShareStatus('snapshot-id');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotShareStatus('snapshot-id');

      expect(result).toBe(false);
    });

    it('should return false when data is null', async () => {
      const mockQuery = createMockQuery();
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSnapshotShareStatus('snapshot-id');

      expect(result).toBe(false);
    });
  });
});
