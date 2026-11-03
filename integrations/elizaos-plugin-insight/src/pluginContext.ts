import type { PreTradeOutcome } from './insightClient.js';
import type { ParsedCheckRequest } from './parseRequest.js';

/**
 * Shared per-process plugin state: the resolved settings, the optional paid
 * fetch, and the most recent check results the provider surfaces into agent
 * state. Ephemeral by design — nothing is persisted.
 */
export interface PluginContext {
  settings: import('./settings.js').InsightSettings;
  paidFetch: typeof fetch | null;
  lastChecks: Array<{ request: ParsedCheckRequest; outcome: PreTradeOutcome; at: string }>;
  recordCheck: (request: ParsedCheckRequest, outcome: PreTradeOutcome) => void;
}

export function createPluginContext(
  settings: import('./settings.js').InsightSettings,
  paidFetch: typeof fetch | null
): PluginContext {
  const lastChecks: PluginContext['lastChecks'] = [];
  return {
    settings,
    paidFetch,
    lastChecks,
    recordCheck(request, outcome) {
      lastChecks.unshift({ request, outcome, at: new Date().toISOString() });
      if (lastChecks.length > 5) lastChecks.length = 5;
    },
  };
}

export function setPluginContext(context: PluginContext): void {
  (globalThis as { __insightPluginContext?: PluginContext }).__insightPluginContext = context;
}

export function getPluginContext(): PluginContext | undefined {
  return (globalThis as { __insightPluginContext?: PluginContext }).__insightPluginContext;
}
