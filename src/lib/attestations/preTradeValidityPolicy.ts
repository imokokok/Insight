/** Operator-enabled validity exception for the bounded WAK testnet handoff. */
export interface PreTradeValidityContext {
  schemaVersion?: number;
  subjectChainId: number;
  sourceAssetId: string;
  destinationAssetId: string;
  action: string;
  tradeAmountUsd: number;
  workflowTag?: string;
  apiKeyId?: string;
}

const WETH = 'eip155:84532/erc20:0x4200000000000000000000000000000000000006';
const USDC = 'eip155:84532/erc20:0x036cbd53842c5426634e7929541ec2318f3dcf7e';

export function selectPreTradeValidity(
  context: PreTradeValidityContext,
  configuredSeconds = process.env.WAK_P1_SIGNED_TTL_SECONDS,
  extendedUntil = process.env.WAK_P1_EXTENDED_VALIDITY_UNTIL
): 600 | 900 | 1800 {
  const extendedUntilSeconds = /^\d{10}$/.test(extendedUntil ?? '')
    ? Number(extendedUntil)
    : Number.NaN;
  const selectedSeconds =
    configuredSeconds === '900'
      ? 900
      : configuredSeconds === '1800' && extendedUntilSeconds > Math.floor(Date.now() / 1000)
        ? 1800
        : 600;
  const pair = [
    context.sourceAssetId.toLowerCase(),
    context.destinationAssetId.toLowerCase(),
  ].sort();
  const expected = [WETH, USDC].sort();
  return selectedSeconds !== 600 &&
    context.schemaVersion === 3 &&
    context.subjectChainId === 84532 &&
    context.workflowTag === 'wak.insight-priorseal.p1.v1' &&
    typeof context.apiKeyId === 'string' &&
    context.apiKeyId.length > 0 &&
    context.action === 'swap' &&
    context.tradeAmountUsd === 4 &&
    pair[0] === expected[0] &&
    pair[1] === expected[1]
    ? selectedSeconds
    : 600;
}
