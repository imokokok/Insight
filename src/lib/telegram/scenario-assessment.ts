import { hashTypedData, keccak256, toBytes } from 'viem';
import { z } from 'zod';

import { getAttesterAccount } from '@/lib/attestations/attesterAccount';
import { buildKeyRegistryConfig, trustedAttesterEntry } from '@/lib/attestations/keyRegistryConfig';
import {
  getHyperliquidPerpExecutionMarketState,
  hyperliquidPerpMarketProfile,
} from '@/lib/dex/hyperliquidPerpMarket';
import { getReviewedAerodromeSlipstreamPreTradeEvidence } from '@/lib/dex/preTradeAerodromeSlipstream';
import { canonicalAaveRiskSymbol } from '@/lib/lending/baseLendingAction';
import {
  evaluatePerpGuardLeverageBand,
  evaluatePerpGuardLeverageVerdicts,
  evaluatePerpGuardVenueIntegrity,
  normalizeSymbol,
} from '@/lib/perps/perpGuardKernel';
import { fetchProtocolRiskParamsForId } from '@/lib/protocols/services/protocolRiskParamsService';

const lending = z
  .object({
    protocolId: z.literal('aave-v3-base'),
    action: z.enum(['supply', 'borrow']),
    collateralSymbol: z.enum(['WETH', 'USDC']),
    loanSymbol: z.enum(['WETH', 'USDC']),
    collateralValueUsd: z.number().finite().positive().max(1_000_000_000_000),
    debtValueUsd: z.number().finite().min(0).max(1_000_000_000_000),
  })
  .strict();
const perps = z
  .object({
    protocolId: z.literal('hyperliquid-perps-mainnet'),
    action: z.enum(['open_long', 'open_short']),
    assetSymbol: z.enum(['BTC', 'ETH']),
    marginAssetSymbol: z.literal('USDC'),
    sizeUsd: z.number().finite().positive().max(1_000_000_000_000),
    marginValueUsd: z.number().finite().positive().max(1_000_000_000_000),
  })
  .strict();
const dex = z
  .object({
    profileId: z.enum([
      'base-aerodrome-slipstream-weth-usdc-cl100',
      'base-aerodrome-slipstream-usdc-usdt-cl1',
    ]),
    direction: z.enum(['token0-to-token1', 'token1-to-token0']),
    amountIn: z
      .string()
      .regex(/^(?:0\.(?:0*[1-9][0-9]*)|[1-9][0-9]*(?:\.[0-9]+)?)$/)
      .max(32),
  })
  .strict();

export const TelegramScenarioInputSchema = z.discriminatedUnion('scenario', [
  z.object({ scenario: z.literal('base_lending'), input: lending }).strict(),
  z.object({ scenario: z.literal('hyperliquid_perps'), input: perps }).strict(),
  z.object({ scenario: z.literal('dex_swap'), input: dex }).strict(),
]);

const DOMAIN = { name: 'Insight Telegram Read-only Assessment', version: '1' } as const;
const ATTESTATION_VALID_FOR_SECONDS = 30 * 86_400;
const REVIEWED_HYPERLIQUID_MAX_LEVERAGE = { BTC: 40, ETH: 25 } as const;
const TYPES = {
  TelegramScenarioAssessment: [
    { name: 'assessmentHash', type: 'bytes32' },
    { name: 'scenario', type: 'string' },
    { name: 'verdict', type: 'uint8' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'validUntil', type: 'uint256' },
    { name: 'schemaVersion', type: 'uint256' },
  ],
} as const;

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(object[key])}`)
      .join(',')}}`;
  }
  throw new TypeError('Scenario assessment is not canonical JSON');
}

export async function createTelegramScenarioAssessment(raw: unknown) {
  const request = TelegramScenarioInputSchema.parse(raw);
  let assessment: Record<string, unknown>;
  if (request.scenario === 'base_lending') {
    const input = request.input;
    if (input.protocolId !== 'aave-v3-base') throw new Error('SCENARIO_MARKET_UNSUPPORTED');
    const riskParams = await fetchProtocolRiskParamsForId('aave-v3-base');
    if (riskParams.source !== 'on-chain') throw new Error('SCENARIO_SOURCE_UNAVAILABLE');
    const collateral = riskParams.params.find(
      (asset) =>
        canonicalAaveRiskSymbol(asset.symbol) === canonicalAaveRiskSymbol(input.collateralSymbol)
    );
    const loan = riskParams.params.find(
      (asset) => canonicalAaveRiskSymbol(asset.symbol) === canonicalAaveRiskSymbol(input.loanSymbol)
    );
    if (!collateral || !loan || !(collateral.maxLtv > 0 && collateral.liquidationThreshold > 0))
      throw new Error('SCENARIO_MARKET_UNSUPPORTED');
    const ltv = input.debtValueUsd / input.collateralValueUsd;
    const liquidationLtv = 1 / collateral.liquidationThreshold;
    let verdict: 'ALLOW' | 'CAUTION' | 'BLOCK' = 'ALLOW';
    const reasons: string[] = [];
    if (ltv >= liquidationLtv) {
      verdict = 'BLOCK';
      reasons.push('Caller-declared debt is at or above the current Aave liquidation threshold.');
    } else if (ltv >= collateral.maxLtv * 0.9) {
      verdict = 'CAUTION';
      reasons.push('Caller-declared debt uses at least 90% of Aave maximum LTV.');
    } else {
      reasons.push('Caller-declared LTV is below the reviewed Aave guard band.');
    }
    assessment = {
      schema: 'insight.telegram-base-lending-readonly-assessment.v1',
      verdict,
      evaluatedAt: new Date().toISOString(),
      scope: {
        chainId: 8453,
        protocolId: 'aave-v3-base',
        transactionAuthority: 'none',
        valuation: 'caller_declared_post_action_usd',
        priceIntegrity: 'not_assessed',
        positionSource: 'caller_declared_what_if',
      },
      market: {
        collateralSymbol: input.collateralSymbol,
        loanSymbol: input.loanSymbol,
        maxLtv: collateral.maxLtv,
        liquidationLtv,
        parameterSource: 'live_on_chain_protocol_risk_parameters',
      },
      projected: {
        collateralValueUsd: input.collateralValueUsd,
        debtValueUsd: input.debtValueUsd,
        ltv,
        liquidationBufferPct: Math.max(0, (1 - ltv / liquidationLtv) * 100),
        conservativeMaxDebtUsd: input.collateralValueUsd * collateral.maxLtv * 0.9,
      },
      reasons,
      limitations: [
        'No wallet or live position was read; USD values are user-declared. Token price integrity and depeg risk were not assessed.',
      ],
      next: { execution: 'not_performed' },
    };
  } else if (request.scenario === 'hyperliquid_perps') {
    const input = request.input;
    const symbol = normalizeSymbol(input.assetSymbol);
    const reviewedMaxLeverage =
      REVIEWED_HYPERLIQUID_MAX_LEVERAGE[symbol as keyof typeof REVIEWED_HYPERLIQUID_MAX_LEVERAGE];
    if (!reviewedMaxLeverage) throw new Error('SCENARIO_MARKET_UNSUPPORTED');
    const venueState = await getHyperliquidPerpExecutionMarketState(
      hyperliquidPerpMarketProfile(symbol as 'BTC' | 'ETH')
    );
    if (venueState.sourceFreshnessSeconds > 30) throw new Error('SCENARIO_SOURCE_UNAVAILABLE');
    const band = evaluatePerpGuardLeverageBand(
      input.sizeUsd,
      input.marginValueUsd,
      reviewedMaxLeverage,
      venueState.perpetual.maxLeverage
    );
    const leverage = evaluatePerpGuardLeverageVerdicts(band.effectiveLeverage, band.maxLeverage);
    const markOracleDeviationBps = Math.abs(
      ((venueState.perpetual.markPrice - venueState.perpetual.oraclePrice) /
        venueState.perpetual.oraclePrice) *
        10_000
    );
    const venueIntegrity = evaluatePerpGuardVenueIntegrity({
      venueLabel: 'Hyperliquid',
      indexPriceLabel: 'venue oracle price',
      divergenceLabel: 'mark/oracle',
      markIndexDeviationBps: markOracleDeviationBps,
      consensusVenueDeviationPct: null,
      marketStatus: null,
    });
    const verdict =
      leverage.verdict === 'BLOCK' || venueIntegrity.verdict === 'BLOCK'
        ? 'BLOCK'
        : leverage.verdict === 'CAUTION' || venueIntegrity.verdict === 'CAUTION'
          ? 'CAUTION'
          : 'ALLOW';
    assessment = {
      schema: 'insight.telegram-hyperliquid-perps-readonly-assessment.v1',
      verdict,
      evaluatedAt: new Date().toISOString(),
      scope: {
        venue: 'hyperliquid',
        network: 'hyperliquid:mainnet',
        transactionAuthority: 'none',
        valuation: 'caller_declared_post_action_usd',
        priceSource: 'hyperliquid_venue_only',
      },
      market: {
        assetSymbol: symbol,
        marginAssetSymbol: 'USDC',
        maxLeverage: band.maxLeverage,
        sourceFreshnessSeconds: venueState.sourceFreshnessSeconds,
        observedAt: venueState.observedAt,
      },
      projected: {
        sizeUsd: input.sizeUsd,
        marginValueUsd: input.marginValueUsd,
        effectiveLeverage: band.effectiveLeverage,
        liquidationBufferPct: band.liquidationBufferPct,
        conservativeMaxSizeUsd: band.conservativeMaxSizeUsd,
      },
      venue: {
        markPrice: venueState.perpetual.markPrice,
        oraclePrice: venueState.perpetual.oraclePrice,
        markOracleDeviationBps,
        spreadBps:
          venueState.book.bids[0] && venueState.book.asks[0]
            ? ((venueState.book.asks[0].price - venueState.book.bids[0].price) /
                venueState.book.bids[0].price) *
              10_000
            : null,
        displayedTopDepthNotionalUsd:
          input.action === 'open_long'
            ? venueState.book.asks[0]
              ? venueState.book.asks[0].price * venueState.book.asks[0].size
              : null
            : venueState.book.bids[0]
              ? venueState.book.bids[0].price * venueState.book.bids[0].size
              : null,
        fundingRate: venueState.perpetual.fundingRate,
        openInterestCoin: venueState.perpetual.openInterest,
        dayNotionalVolume: venueState.perpetual.dayNotionalVolume,
        liveMaxLeverage: venueState.perpetual.maxLeverage,
      },
      reasons: [...leverage.reasons, ...venueIntegrity.reasons],
      limitations: [
        'Only Hyperliquid venue data was evaluated. No cross-venue price check, account position, or liquidation-engine outcome was assessed.',
      ],
      next: { execution: 'not_performed' },
    };
  } else {
    const profile = request.input.profileId;
    const forward = request.input.direction === 'token0-to-token1';
    const evidence = await getReviewedAerodromeSlipstreamPreTradeEvidence(
      {
        chainId: 8453,
        profileId: profile,
        asset: profile.includes('weth-usdc')
          ? forward
            ? 'WETH'
            : 'USDC'
          : forward
            ? 'USDC'
            : 'USDT',
        destinationAsset: profile.includes('weth-usdc')
          ? forward
            ? 'USDC'
            : 'WETH'
          : forward
            ? 'USDT'
            : 'USDC',
        amountIn: request.input.amountIn,
      },
      { signal: AbortSignal.timeout(15_000) }
    );
    if (
      evidence.sourceFreshnessSeconds > 60 ||
      !Number.isFinite(evidence.twapDeviationBpsFromSpot)
    ) {
      throw new Error('SCENARIO_SOURCE_UNAVAILABLE');
    }
    assessment = {
      schema: 'insight.telegram-dex-readonly-assessment.v1',
      verdict: 'CAUTION',
      evaluatedAt: evidence.observedAt,
      scope: {
        chainId: 8453,
        venue: evidence.venue,
        transactionAuthority: 'none',
        valuation: 'on_chain_quote_only',
      },
      market: {
        profileId: evidence.profile,
        market: evidence.market,
        direction: evidence.direction,
      },
      quote: {
        amountIn: request.input.amountIn,
        estimatedAmountOut: evidence.quote.amountOut,
        sourceFreshnessSeconds: evidence.sourceFreshnessSeconds,
        block: evidence.block,
      },
      priceIntegrity: {
        spotToken1PerToken0: evidence.spotToken1PerToken0,
        twapToken1PerToken0: evidence.twapToken1PerToken0,
        deviationBps: evidence.twapDeviationBpsFromSpot,
      },
      reasons: [
        'Quote and TWAP are shown for user review; no transaction-specific slippage or impact policy is applied in this Telegram read-only check.',
      ],
      next: { execution: 'not_performed' },
    };
  }

  const verdict = assessment.verdict;
  if (verdict !== 'ALLOW' && verdict !== 'CAUTION' && verdict !== 'BLOCK')
    throw new Error('SCENARIO_ASSESSMENT_INVALID');
  const account = await getAttesterAccount();
  if (!account) throw new Error('SCENARIO_ATTESTER_UNAVAILABLE');
  const issuedAt = Math.floor(Date.now() / 1000);
  const registry = buildKeyRegistryConfig(account.address);
  if (!trustedAttesterEntry(account.address, issuedAt, registry))
    throw new Error('SCENARIO_ATTESTER_UNTRUSTED');
  const assessmentHash = keccak256(toBytes(canonical({ scenario: request.scenario, assessment })));
  const message = {
    assessmentHash,
    scenario: request.scenario,
    verdict: verdict === 'ALLOW' ? 0 : verdict === 'CAUTION' ? 1 : 2,
    issuedAt: BigInt(issuedAt),
    validUntil: BigInt(issuedAt + ATTESTATION_VALID_FOR_SECONDS),
    schemaVersion: 1n,
  };
  const typedData = {
    domain: DOMAIN,
    types: TYPES,
    primaryType: 'TelegramScenarioAssessment' as const,
    message,
  };
  const signature = await account.signTypedData(typedData);
  return {
    schema: 'insight.telegram-scenario-assessment.v1',
    scenario: request.scenario,
    assessment,
    attestation: {
      type: 'TelegramScenarioAssessment',
      schemaVersion: 1,
      uid: hashTypedData(typedData),
      attester: account.address,
      signedAt: new Date(issuedAt * 1000).toISOString(),
      validForSeconds: ATTESTATION_VALID_FOR_SECONDS,
      signature,
      data: {
        assessmentHash,
        scenario: request.scenario,
        verdict: message.verdict,
        issuedAt,
        validUntil: issuedAt + ATTESTATION_VALID_FOR_SECONDS,
        schemaVersion: 1,
      },
      eip712: { domain: DOMAIN, types: TYPES, primaryType: 'TelegramScenarioAssessment' },
    },
  };
}
