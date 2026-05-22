import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';
import type {
  OracleReputation,
  ReputationTrendPoint,
} from '@/lib/oracles/services/reputationService';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useReputations');

interface ReputationApiResponse {
  success: boolean;
  data: OracleReputation[];
  meta?: {
    calculating?: boolean;
    message?: string;
    recalcIntervalMs?: number;
    nextRecalcAt?: string | null;
  };
}

interface ReputationDetailWithTrend {
  reputation: OracleReputation;
  trend: ReputationTrendPoint[];
}

async function fetchReputations(): Promise<{
  data: OracleReputation[];
  calculating: boolean;
  message?: string;
  nextRecalcAt?: string | null;
}> {
  try {
    const response = await apiClient.get<ReputationApiResponse>('/api/reputation');
    return {
      data: response.data.data ?? [],
      calculating: response.data.meta?.calculating ?? false,
      message: response.data.meta?.message,
      nextRecalcAt: response.data.meta?.nextRecalcAt,
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
  return useQuery<
    {
      data: OracleReputation[];
      calculating: boolean;
      message?: string;
      nextRecalcAt?: string | null;
    },
    Error
  >({
    queryKey: ['reputations'],
    queryFn: fetchReputations,
    staleTime: 3 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
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
      return 5 * 60 * 1000;
    },
    retry: 2,
  });
}

export function useRecalculateReputation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{
        success: boolean;
        data?: { total: number; success: number; failed: number };
        error?: { code: string; message: string };
      }>('/api/reputation', {});

      if (!response.data.success && response.data.error?.code === 'CALC_IN_PROGRESS') {
        throw new Error('Calculation already in progress');
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reputations'] });
      queryClient.invalidateQueries({ queryKey: ['reputation'] });
    },
  });
}

async function fetchReputationDetail(
  provider: string,
  includeTrend: boolean = false,
  trendDays: number = 30
): Promise<ReputationDetailWithTrend | null> {
  try {
    const params = new URLSearchParams();
    if (includeTrend) {
      params.set('trend', 'true');
      params.set('days', String(trendDays));
    }
    const qs = params.toString();
    const url = `/api/reputation/${encodeURIComponent(provider)}${qs ? `?${qs}` : ''}`;

    const response = await apiClient.get<{
      success: boolean;
      data: OracleReputation & { trend?: ReputationTrendPoint[] };
    }>(url);

    const raw = response.data.data;
    if (!raw) return null;

    const { trend, ...reputation } = raw;
    return {
      reputation: reputation as OracleReputation,
      trend: trend ?? [],
    };
  } catch (error) {
    logger.error(
      `Failed to fetch reputation for ${provider}`,
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export function useReputationDetail(
  provider: string | undefined,
  options?: { includeTrend?: boolean; trendDays?: number }
) {
  const includeTrend = options?.includeTrend ?? false;
  const trendDays = options?.trendDays ?? 30;

  return useQuery<ReputationDetailWithTrend | null, Error>({
    queryKey: ['reputation', provider, includeTrend, trendDays],
    queryFn: () => fetchReputationDetail(provider!, includeTrend, trendDays),
    enabled: !!provider,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    refetchInterval(query) {
      const data = query.state.data;
      if (!data || data.reputation.overall_score <= 0) {
        return 20 * 1000;
      }
      return 5 * 60 * 1000;
    },
    retry: 2,
  });
}
