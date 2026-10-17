import { CHAIN_IDS } from './settings.js';

export interface ParsedCheckRequest {
  asset: string;
  chainId: number;
  action: string;
  tradeAmountUsd?: number;
  destinationAsset?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** `ETH/USDC`, `WETH → USDC`, or a bare base-asset symbol (quote defaults to USDC). */
function parseAsset(raw: string): string | null {
  const collapsed = raw.trim().replace(/\s+/g, ' ');
  const cleaned = collapsed.replace(/ (?:\/|->|→|to) /i, '/');
  if (/^[A-Za-z0-9]+\/[A-Za-z0-9]+$/.test(cleaned)) return cleaned.toUpperCase();
  if (/^[A-Za-z0-9]{2,20}$/.test(cleaned.trim())) return `${cleaned.trim().toUpperCase()}/USDC`;
  return null;
}

function parseChain(raw: string): number | null {
  const cleaned = raw.trim().toLowerCase();
  if (/^\d+$/.test(cleaned)) {
    const id = Number.parseInt(cleaned, 10);
    return id > 0 ? id : null;
  }
  return CHAIN_IDS[cleaned] ?? null;
}

/**
 * Resolve the check parameters from structured action options first, then from
 * free-form message text ("check ETH/USDC on base before swapping $500").
 */
export function parseCheckRequest(
  options: Record<string, unknown> | undefined,
  messageText: string
): ParsedCheckRequest | { error: string } {
  const opt = options && isRecord(options) ? options : {};
  const optParams = isRecord(opt.params) ? opt.params : {};
  const source: Record<string, unknown> = {
    ...messageTextAsSource(messageText),
    ...optParams,
    ...opt,
  };

  const assetRaw = typeof source.asset === 'string' ? source.asset : '';
  const asset = assetRaw ? parseAsset(assetRaw) : null;
  if (!asset) {
    return {
      error:
        'No asset pair found. Name the pair explicitly, e.g. "check ETH/USDC on base" or pass asset: "ETH/USDC".',
    };
  }

  let chainId: number | null = null;
  if (typeof source.chainId === 'number') chainId = source.chainId;
  else if (typeof source.chainId === 'string' || typeof source.chain === 'string') {
    chainId = parseChain(String(source.chainId ?? source.chain));
  }
  if (chainId === null) {
    const textChain = messageText.match(
      /\b(?:on|for)\s+(ethereum|base|arbitrum|polygon|optimism|op|avalanche|avax|sei|x-layer|monad|bsc|bnb|base-sepolia)\b/i
    );
    chainId = textChain ? CHAIN_IDS[textChain[1].toLowerCase()] : 8453;
  }

  const action =
    typeof source.action === 'string' && source.action.trim() !== ''
      ? source.action.trim()
      : 'swap';
  const tradeAmountUsd =
    typeof source.tradeAmountUsd === 'number'
      ? source.tradeAmountUsd
      : typeof source.tradeAmountUsd === 'string' && source.tradeAmountUsd.trim() !== ''
        ? Number.parseFloat(source.tradeAmountUsd)
        : undefined;
  const destinationAsset =
    typeof source.destinationAsset === 'string' && source.destinationAsset.trim() !== ''
      ? source.destinationAsset.trim()
      : undefined;

  return {
    asset,
    chainId,
    action,
    ...(Number.isFinite(tradeAmountUsd) && tradeAmountUsd !== undefined && tradeAmountUsd > 0
      ? { tradeAmountUsd }
      : {}),
    ...(destinationAsset ? { destinationAsset } : {}),
  };
}

function messageTextAsSource(text: string): Record<string, unknown> {
  const source: Record<string, unknown> = {};
  const pair = text.match(/\b([A-Z]{2,10})\s*(?:\/|->|→)\s*([A-Z]{2,10})\b/);
  if (pair) source.asset = `${pair[1]}/${pair[2]}`;
  else {
    const single = text.match(
      /\b(?:check|verify|assess)\s+(?:the\s+)?(?:price\s+(?:of|for)\s+)?([A-Z]{2,10})\b/
    );
    if (single) source.asset = single[1];
  }
  const chain = text.match(
    /\bon\s+(ethereum|base|arbitrum|polygon|optimism|avalanche|sei|x-layer|monad|bsc|bnb)\b/i
  );
  if (chain) source.chain = chain[1];
  const amount = text.match(/\$\s?([\d,.]+)/);
  if (amount) {
    const value = Number.parseFloat(amount[1].replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0) source.tradeAmountUsd = value;
  }
  return source;
}

/** Render the outcome as compact agent-readable text (verdict + machine facts). */
export function formatPreTradeText(
  request: ParsedCheckRequest,
  outcome: { verdict: string; reasonCodes: string[]; warnings: string[]; paymentSettled: boolean }
): string {
  const lines = [
    `Insight oracle safety: ${outcome.verdict} for ${request.asset} on chain ${request.chainId}` +
      (request.tradeAmountUsd ? ` (trade size $${request.tradeAmountUsd})` : ''),
  ];
  if (outcome.reasonCodes.length > 0) lines.push(`Reason codes: ${outcome.reasonCodes.join(', ')}`);
  if (outcome.warnings.length > 0) lines.push(`Warnings: ${outcome.warnings.join(', ')}`);
  lines.push(
    outcome.verdict === 'PASS'
      ? 'Decision input is trustworthy; proceed with the trade at your own risk.'
      : 'Do NOT treat this trade as safe without resolving the reasons above.'
  );
  if (outcome.paymentSettled) lines.push('x402 payment settled for this check.');
  return lines.join('\n');
}
