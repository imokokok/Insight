'use client';

import { useCallback, useState } from 'react';

import { useSession } from '@/stores/authStore';

type McpRequest = {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: unknown;
};

type McpResponse = {
  jsonrpc: '2.0';
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetAt: number;
}

interface UseMcpClientOptions {
  /** Optional explicit API key. When absent, the current Supabase session JWT is used. */
  apiKey?: string;
}

interface UseMcpClientResult {
  /** Send a single JSON-RPC request to /api/mcp. */
  call: (method: string, params?: unknown) => Promise<unknown>;
  /** Whether a request is in flight. */
  loading: boolean;
  /** Error message from the last failed request, or null. */
  error: string | null;
  /** Rate-limit state parsed from the last response headers. */
  rateLimit: RateLimitInfo | null;
  /** Credit balance parsed from the last response headers (API-key auth only). */
  quota: { limit: number; remaining: number; resetAt: number } | null;
  /** Clear the error state. */
  clearError: () => void;
}

/**
 * Browser-side MCP client for the project's Next.js /api/mcp endpoint.
 *
 * Authentication precedence:
 *   1. Supabase session JWT from the auth store (logged-in users).
 *   2. Explicit `apiKey` option passed to the hook.
 *
 * The hook parses rate-limit and credit-balance headers so the UI can show
 * usage. `quota.remaining` is the remaining credit balance for API-key calls.
 */
export function useMcpClient(options: UseMcpClientOptions = {}): UseMcpClientResult {
  const session = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);
  const [quota, setQuota] = useState<{ limit: number; remaining: number; resetAt: number } | null>(
    null
  );

  const call = useCallback(
    async (method: string, params?: unknown): Promise<unknown> => {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      };

      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      } else if (options.apiKey) {
        headers['X-API-Key'] = options.apiKey;
      }

      const body: McpRequest = {
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method,
        params,
      };

      try {
        const response = await fetch('/api/mcp', {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        const limit = Number(response.headers.get('X-RateLimit-Limit') || '0');
        const remaining = Number(response.headers.get('X-RateLimit-Remaining') || '0');
        const resetAt = Number(response.headers.get('X-RateLimit-Reset') || '0') * 1000;
        setRateLimit(limit > 0 ? { limit, remaining, resetAt } : null);

        // Credit model: X-Quota-Remaining carries the remaining credit balance.
        const quotaLimit = Number(response.headers.get('X-Quota-Limit') || '-1');
        const quotaRemaining = Number(response.headers.get('X-Quota-Remaining') || '-1');
        const quotaResetAt = Number(response.headers.get('X-Quota-Reset') || '0') * 1000;
        setQuota(
          quotaRemaining >= 0
            ? { limit: quotaLimit, remaining: quotaRemaining, resetAt: quotaResetAt }
            : null
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
        }

        const data = (await response.json()) as McpResponse;
        if (data.error) {
          throw new Error(`${data.error.message} (code: ${data.error.code})`);
        }
        return data.result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'MCP request failed';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session?.access_token, options.apiKey]
  );

  const clearError = useCallback(() => setError(null), []);

  return { call, loading, error, rateLimit, quota, clearError };
}
