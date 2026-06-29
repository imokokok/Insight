import type { RiskLevel } from './types';

interface RiskLevelState {
  level: RiskLevel;
  since: number;
}

const stateMap = new Map<string, RiskLevelState>();

export function trackRiskLevelDuration(key: string, currentLevel: RiskLevel): number {
  const now = Date.now();
  const previous = stateMap.get(key);

  if (!previous || previous.level !== currentLevel) {
    stateMap.set(key, { level: currentLevel, since: now });
    return 0;
  }

  return Math.floor((now - previous.since) / 1000);
}

export function getRiskLevelState(key: string): RiskLevelState | undefined {
  return stateMap.get(key);
}

export function resetRiskLevelTracking(key?: string): void {
  if (key) {
    stateMap.delete(key);
  } else {
    stateMap.clear();
  }
}
