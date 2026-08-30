import { getModelStatus } from '@/lib/ml/inference';

export function formatAsText(data: unknown): string {
  if (data === null || data === undefined) {
    return 'No data available.';
  }

  if (typeof data === 'string') {
    return data;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return String(data);
  }

  return JSON.stringify(data, null, 2);
}

export function formatPrice(price: number, decimals = 4): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Human-readable ML model provenance lines for tool output. Agents gating on
 * the forward-looking ML risk score can see WHICH model produced it (training
 * time, horizons, out-of-time AUC per horizon) instead of an opaque number.
 */
export function buildMlModelMetadataLines(): string[] {
  const status = getModelStatus();
  if (!status.active) return ['- ML model: inactive (rule-based signals only)'];
  const trained = status.trainedAt ? status.trainedAt.slice(0, 10) : 'unknown';
  const horizonBits = status.horizonDetails.map((h) => {
    const auc = h.auc !== null ? 'auc ' + h.auc.toFixed(3) : 'auc n/a';
    return h.name + (h.verified ? '' : ' (unverified)') + ' ' + auc;
  });
  return ['- ML model: trained ' + trained + ', horizons: ' + horizonBits.join(' | ')];
}
