import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { apiClient } from '@/lib/api';
import { useUser, useProfile } from '@/stores/authStore';

import {
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
  useToggleFavorite,
  useIsFavorited,
} from '../data/useFavorites';

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
  useProfile: jest.fn(),
}));

jest.mock('@/lib/api', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    channel: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    removeChannel: jest.fn(),
  },
}));

jest.mock('@/lib/errors', () => ({
  AuthenticationError: class AuthenticationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'AuthenticationError';
    }
  },
}));

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

const mockProfile = {
  id: 'test-user-id',
  preferences: {},
};

const mockFavorite = {
  id: 'fav-1',
  user_id: 'test-user-id',
  name: 'BTC Favorite',
  config_type: 'oracle_config',
  config_data: { selectedOracles: ['chainlink'] },
  created_at: '2024-01-01T00:00:00.000Z',
};

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (useProfile as jest.Mock).mockReturnValue(mockProfile);
  });

  it('should return empty array when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toEqual([]);
  });

  it('should fetch favorites for logged in user', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [mockFavorite], count: 1 },
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].name).toBe('BTC Favorite');
    expect(apiClient.get).toHaveBeenCalledWith('/api/favorites');
  });

  it('should fetch favorites by type', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [mockFavorite], count: 1 },
    });

    const { result } = renderHook(() => useFavorites({ configType: 'oracle_config' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/favorites?config_type=oracle_config');
  });

  it('should handle fetch error', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error('Fetch error'));

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch favorites', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [mockFavorite], count: 1 },
    });

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});

describe('useAddFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (useProfile as jest.Mock).mockReturnValue(mockProfile);
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useAddFavorite(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.addFavorite('Test', 'oracle_config', {});
      })
    ).rejects.toThrow('User must be logged in');
  });

  it('should add favorite successfully', async () => {
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { favorite: mockFavorite, message: 'Favorite added' },
    });

    const { result } = renderHook(() => useAddFavorite(), {
      wrapper: createTestWrapper(),
    });

    let addedFavorite: typeof mockFavorite | null = null;
    await act(async () => {
      addedFavorite = await result.current.addFavorite('BTC Favorite', 'oracle_config', {
        selectedOracles: ['chainlink'],
      });
    });

    expect(addedFavorite).toEqual(mockFavorite);
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/favorites',
      expect.objectContaining({
        name: 'BTC Favorite',
        config_type: 'oracle_config',
        config_data: { selectedOracles: ['chainlink'] },
      })
    );
  });

  it('should track isAdding state', async () => {
    let resolveAdd: (value: { data: { favorite: typeof mockFavorite; message: string } }) => void;
    const addPromise = new Promise<{ data: { favorite: typeof mockFavorite; message: string } }>(
      (resolve) => {
        resolveAdd = resolve;
      }
    );
    (apiClient.post as jest.Mock).mockReturnValue(addPromise);

    const { result } = renderHook(() => useAddFavorite(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isAdding).toBe(false);

    let favoritePromise: Promise<typeof mockFavorite>;
    act(() => {
      favoritePromise = result.current.addFavorite('Test', 'oracle_config', {});
    });

    await waitFor(() => {
      expect(result.current.isAdding).toBe(true);
    });

    resolveAdd!({ data: { favorite: mockFavorite, message: 'Favorite added' } });
    await act(async () => {
      await favoritePromise!;
    });

    expect(result.current.isAdding).toBe(false);
  });
});

describe('useRemoveFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (useProfile as jest.Mock).mockReturnValue(mockProfile);
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useRemoveFavorite(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.removeFavorite('fav-1');
      })
    ).rejects.toThrow('User must be logged in');
  });

  it('should remove favorite successfully', async () => {
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: { message: 'Favorite deleted' },
    });

    const { result } = renderHook(() => useRemoveFavorite(), {
      wrapper: createTestWrapper(),
    });

    let success = false;
    await act(async () => {
      success = await result.current.removeFavorite('fav-1');
    });

    expect(success).toBe(true);
    expect(apiClient.delete).toHaveBeenCalledWith('/api/favorites/fav-1');
  });

  it('should track isRemoving state', async () => {
    let resolveRemove: (value: { data: { message: string } }) => void;
    const removePromise = new Promise<{ data: { message: string } }>((resolve) => {
      resolveRemove = resolve;
    });
    (apiClient.delete as jest.Mock).mockReturnValue(removePromise);

    const { result } = renderHook(() => useRemoveFavorite(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isRemoving).toBe(false);

    let deletePromise: Promise<boolean>;
    act(() => {
      deletePromise = result.current.removeFavorite('fav-1');
    });

    await waitFor(() => {
      expect(result.current.isRemoving).toBe(true);
    });

    resolveRemove!({ data: { message: 'Favorite deleted' } });
    await act(async () => {
      await deletePromise!;
    });

    expect(result.current.isRemoving).toBe(false);
  });
});

describe('useToggleFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (useProfile as jest.Mock).mockReturnValue(mockProfile);
  });

  it('should add favorite when not exists', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [], count: 0 },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { favorite: mockFavorite, message: 'Favorite added' },
    });

    const { result } = renderHook(() => useToggleFavorite(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isToggling).toBe(false);
    });

    let toggleResult: { action: string } | undefined;
    await act(async () => {
      toggleResult = await result.current.toggleFavorite('BTC Favorite', 'oracle_config', {
        selectedOracles: ['chainlink'],
      });
    });

    expect(toggleResult!.action).toBe('added');
  });

  it('should remove favorite when exists', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [mockFavorite], count: 1 },
    });
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: { message: 'Favorite deleted' },
    });

    const { result } = renderHook(() => useToggleFavorite(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isToggling).toBe(false);
    });

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalled();
    });

    let toggleResult: { action: string } | undefined;
    await act(async () => {
      toggleResult = await result.current.toggleFavorite('BTC Favorite', 'oracle_config', {
        selectedOracles: ['chainlink'],
      });
    });

    expect(toggleResult!.action).toBe('removed');
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);
    (useProfile as jest.Mock).mockReturnValue(null);
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [], count: 0 },
    });

    const { result } = renderHook(() => useToggleFavorite(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.toggleFavorite('Test', 'oracle_config', {});
      })
    ).rejects.toThrow('User must be logged in');
  });
});

describe('useIsFavorited', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (useProfile as jest.Mock).mockReturnValue(mockProfile);
  });

  it('should return false when not favorited', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [], count: 0 },
    });

    const { result } = renderHook(
      () => useIsFavorited('oracle_config', { selectedOracles: ['chainlink'] }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isFavorited).toBe(false);
    });
  });

  it('should return true when favorited', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { favorites: [mockFavorite], count: 1 },
    });

    const { result } = renderHook(
      () => useIsFavorited('oracle_config', { selectedOracles: ['chainlink'] }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isFavorited).toBe(true);
    });

    expect(result.current.favorite).toEqual(mockFavorite);
  });
});
