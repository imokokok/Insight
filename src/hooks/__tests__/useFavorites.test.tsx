import { type ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';

import { queries } from '@/lib/supabase/client';
import { useUser, useProfile } from '@/stores/authStore';

import {
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
  useToggleFavorite,
  useIsFavorited,
  useUpdateFavorite,
} from '../data/useFavorites';

jest.mock('@/stores/authStore', () => ({
  useUser: jest.fn(),
  useProfile: jest.fn(),
}));

jest.mock('@/lib/supabase/client', () => ({
  queries: {
    getFavorites: jest.fn(),
    getFavoritesByType: jest.fn(),
    addFavorite: jest.fn(),
    deleteFavorite: jest.fn(),
    updateFavorite: jest.fn(),
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
    (queries.getFavorites as jest.Mock).mockResolvedValue([mockFavorite]);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.favorites).toHaveLength(1);
    expect(result.current.favorites[0].name).toBe('BTC Favorite');
  });

  it('should fetch favorites by type', async () => {
    (queries.getFavoritesByType as jest.Mock).mockResolvedValue([mockFavorite]);

    const { result } = renderHook(() => useFavorites({ configType: 'oracle_config' }), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(queries.getFavoritesByType).toHaveBeenCalledWith('test-user-id', 'oracle_config');
  });

  it('should handle fetch error', async () => {
    (queries.getFavorites as jest.Mock).mockRejectedValue(new Error('Fetch error'));

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });

  it('should refetch favorites', async () => {
    (queries.getFavorites as jest.Mock).mockResolvedValue([mockFavorite]);

    const { result } = renderHook(() => useFavorites(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(queries.getFavorites).toHaveBeenCalledTimes(2);
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
    (queries.addFavorite as jest.Mock).mockResolvedValue(mockFavorite);

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
  });

  it('should track isAdding state', async () => {
    let resolveAdd: (value: typeof mockFavorite) => void;
    const addPromise = new Promise<typeof mockFavorite>((resolve) => {
      resolveAdd = resolve;
    });
    (queries.addFavorite as jest.Mock).mockReturnValue(addPromise);

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

    resolveAdd!(mockFavorite);
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
    (queries.deleteFavorite as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useRemoveFavorite(), {
      wrapper: createTestWrapper(),
    });

    let success = false;
    await act(async () => {
      success = await result.current.removeFavorite('fav-1');
    });

    expect(success).toBe(true);
  });

  it('should track isRemoving state', async () => {
    let resolveRemove: (value: boolean) => void;
    const removePromise = new Promise<boolean>((resolve) => {
      resolveRemove = resolve;
    });
    (queries.deleteFavorite as jest.Mock).mockReturnValue(removePromise);

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

    resolveRemove!(true);
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
    (queries.getFavorites as jest.Mock).mockResolvedValue([]);
    (queries.addFavorite as jest.Mock).mockResolvedValue(mockFavorite);

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
    (queries.getFavorites as jest.Mock).mockResolvedValue([mockFavorite]);
    (queries.deleteFavorite as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useToggleFavorite(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isToggling).toBe(false);
    });

    await waitFor(() => {
      expect(queries.getFavorites).toHaveBeenCalled();
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
    (queries.getFavorites as jest.Mock).mockResolvedValue([]);

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
    (queries.getFavoritesByType as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(
      () => useIsFavorited('oracle_config', { selectedOracles: ['chainlink'] }),
      { wrapper: createTestWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isFavorited).toBe(false);
    });
  });

  it('should return true when favorited', async () => {
    (queries.getFavoritesByType as jest.Mock).mockResolvedValue([mockFavorite]);

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

describe('useUpdateFavorite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useUser as jest.Mock).mockReturnValue(mockUser);
    (useProfile as jest.Mock).mockReturnValue(mockProfile);
  });

  it('should throw error when user is not logged in', async () => {
    (useUser as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useUpdateFavorite(), {
      wrapper: createTestWrapper(),
    });

    await expect(
      act(async () => {
        await result.current.updateFavorite('fav-1', { name: 'Updated' });
      })
    ).rejects.toThrow('User must be logged in');
  });

  it('should update favorite successfully', async () => {
    const updatedFavorite = { ...mockFavorite, name: 'Updated Name' };
    (queries.updateFavorite as jest.Mock).mockResolvedValue(updatedFavorite);

    const { result } = renderHook(() => useUpdateFavorite(), {
      wrapper: createTestWrapper(),
    });

    let updated: typeof mockFavorite | null = null;
    await act(async () => {
      updated = await result.current.updateFavorite('fav-1', { name: 'Updated Name' });
    });

    expect(updated?.name).toBe('Updated Name');
  });

  it('should update config data', async () => {
    const updatedFavorite = {
      ...mockFavorite,
      config_data: { selectedOracles: ['pyth'] },
    };
    (queries.updateFavorite as jest.Mock).mockResolvedValue(updatedFavorite);

    const { result } = renderHook(() => useUpdateFavorite(), {
      wrapper: createTestWrapper(),
    });

    let updated: typeof mockFavorite | null = null;
    await act(async () => {
      updated = await result.current.updateFavorite('fav-1', {
        configData: { selectedOracles: ['pyth'] },
      });
    });

    expect(updated?.config_data).toEqual({ selectedOracles: ['pyth'] });
  });

  it('should track isUpdating state', async () => {
    let resolveUpdate: (value: typeof mockFavorite) => void;
    const updatePromise = new Promise<typeof mockFavorite>((resolve) => {
      resolveUpdate = resolve;
    });
    (queries.updateFavorite as jest.Mock).mockReturnValue(updatePromise);

    const { result } = renderHook(() => useUpdateFavorite(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isUpdating).toBe(false);

    let favoritePromise: Promise<typeof mockFavorite>;
    act(() => {
      favoritePromise = result.current.updateFavorite('fav-1', { name: 'Updated' });
    });

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(true);
    });

    resolveUpdate!(mockFavorite);
    await act(async () => {
      await favoritePromise!;
    });

    expect(result.current.isUpdating).toBe(false);
  });
});
