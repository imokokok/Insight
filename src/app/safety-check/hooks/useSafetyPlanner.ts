import { useState, useCallback } from 'react';

import type { PositionInput, SafetyParameterPlan } from '@/lib/protocols/protocolHealth';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useSafetyPlanner');

interface UseSafetyPlannerReturn {
  plan: SafetyParameterPlan | null;
  isLoading: boolean;
  error: string | null;
  targetDeviation: number; // 当前滑块值
  setTargetDeviation: (v: number) => void;
  generatePlan: (position: PositionInput, deviation: number) => Promise<void>;
  clear: () => void;
}

export function useSafetyPlanner(): UseSafetyPlannerReturn {
  const [plan, setPlan] = useState<SafetyParameterPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetDeviation, setTargetDeviation] = useState(15); // 默认 15%

  const generatePlan = useCallback(async (position: PositionInput, deviation: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/protocol-health/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ position, targetDeviationPercent: deviation }),
      });

      let json: { success?: boolean; error?: { message?: string }; data?: { plan?: unknown } };
      try {
        json = await response.json();
      } catch {
        throw new Error(`Failed to generate safety plan (HTTP ${response.status})`);
      }

      if (!response.ok || !json.success) {
        const message = json.error?.message || 'Failed to generate safety plan';
        throw new Error(message);
      }

      if (!json.data?.plan) {
        throw new Error('Failed to generate safety plan: missing plan in response');
      }

      setPlan(json.data.plan as SafetyParameterPlan);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      logger.error(`Safety plan failed: ${message}`);
      setError(message);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  return { plan, isLoading, error, targetDeviation, setTargetDeviation, generatePlan, clear };
}
