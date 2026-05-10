import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import type { OracleReputation } from '@/lib/oracles/services/reputationService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useReputations');

interface ReputationApiResponse {
  success: boolean;
  data: OracleReputation[];
  meta?: {
    calculating?: boolean;
    message?: string;
  };
}

async function fetchReputations(): Promise<{
  data: OracleReputation[];
  calculating: boolean;
  message?: string;
}> {
  try {
    const response = await apiClient.get<ReputationApiResponse>('/api/reputation');
    return {
      data: response.data.data ?? [],
      calculating: response.data.meta?.calculating ?? false,
      message: response.data.meta?.message,
    };
  } catch (error) {
    logger.error(
      'Failed to fetch reputations',
      error instanceof Error ? error : new Error(String(error))
    );
    return { data: [], calculating: false };
  }
}

export function useReputations() {
  return useQuery<{ data: OracleReputation[]; calculating: boolean; message?: string }, Error>({
    queryKey: ['reputations'],
    queryFn: fetchReputations,
    staleTime: 60 * 1000,
    refetchInterval(query) {
      if (query.state.data?.calculating) {
        return 15 * 1000;
      }
      if (
        query.state.data &&
        query.state.data.data.length > 0 &&
        query.state.data.data.every((r) => r.overall_score <= 0)
      ) {
        return 30 * 1000;
      }
      return 10 * 60 * 1000;
    },
    retry: 2,
  });
}

async function fetchReputationDetail(provider: string): Promise<OracleReputation | null> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: OracleReputation;
    }>(`/api/reputation/${encodeURIComponent(provider)}`);
    return response.data.data ?? null;
  } catch (error) {
    logger.error(
      `Failed to fetch reputation for ${provider}`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export function useReputationDetail(provider: string | undefined) {
  return useQuery<OracleReputation | null, Error>({
    queryKey: ['reputation', provider],
    queryFn: () => fetchReputationDetail(provider!),
    enabled: !!provider,
    staleTime: 60 * 1000,
    refetchInterval(query) {
      const data = query.state.data;
      if (!data || data.overall_score <= 0) {
        return 20 * 1000;
      }
      return 10 * 60 * 1000;
    },
    retry: 2,
  });
}
