/**
 * Test utilities for Insight project
 * Provides common testing helpers and mock data generators
 */

import { QueryClient } from '@tanstack/react-query';
import { ReactNode } from 'react';

/**
 * Create a test QueryClient with default options
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });
}

/**
 * Wrapper component for React Query testing
 */
export function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <div>{children}</div>
    );
  };
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random hex string
 */
export function generateRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a random Ethereum address
 */
export function generateRandomAddress(): string {
  return `0x${generateRandomHex(40)}`;
}

/**
 * Mock fetch response
 */
export function mockFetchResponse(data: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

/**
 * Mock fetch error
 */
export function mockFetchError(message: string, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  } as Response);
}

/**
 * Calculate coefficient of variation
 */
export function calculateCoefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return stdDev / mean;
}

/**
 * Check if array is sorted in ascending order
 */
export function isSortedAscending<T>(arr: T[], key?: keyof T): boolean {
  for (let i = 1; i < arr.length; i++) {
    const prev = key ? (arr[i - 1] as T)[key] : arr[i - 1];
    const curr = key ? (arr[i] as T)[key] : arr[i];
    if (prev > curr) return false;
  }
  return true;
}

/**
 * Check if array is sorted in descending order
 */
export function isSortedDescending<T>(arr: T[], key?: keyof T): boolean {
  for (let i = 1; i < arr.length; i++) {
    const prev = key ? (arr[i - 1] as T)[key] : arr[i - 1];
    const curr = key ? (arr[i] as T)[key] : arr[i];
    if (prev < curr) return false;
  }
  return true;
}
