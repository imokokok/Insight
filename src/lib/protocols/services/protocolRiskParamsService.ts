import { IUiPoolDataProvider_ABI } from '@aave-dao/aave-address-book/abis';
import { decodeEventLog, decodeFunctionResult, encodeFunctionData, getEventSelector } from 'viem';

import { getChainId } from '@/lib/protocols/importer/chainId';
import { getLogs, readContract } from '@/lib/protocols/importer/rpcClient';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import { createLogger } from '@/lib/utils/logger';

import { PROTOCOL_REGISTRY, type ProtocolConfig } from '../protocolRegistry';

const logger = createLogger('protocol-risk-params-service');

// Aave reserves use WETH/WPOL/etc. but the registry uses ETH/MATIC/etc.
const SYMBOL_NORMALIZATION: Record<string, string> = {
  WETH: 'ETH',
  WPOL: 'MATIC',
  USDCn: 'USDC',
  USDT0: 'USDT',
  USDbC: 'USDC',
  WBTC: 'WBTC',
  cbETH: 'cbETH',
  wstETH: 'wstETH',
  DAI: 'DAI',
  USDT: 'USDT',
  USDC: 'USDC',
  LINK: 'LINK',
  ARB: 'ARB',
  OP: 'OP',
  // Compound V2 style markets (Venus / BENQI)
  vBTC: 'BTCB',
  vETH: 'ETH',
  vBNB: 'BNB',
  vUSDC: 'USDC',
  vUSDT: 'USDT',
  vDAI: 'DAI',
  vLINK: 'LINK',
  qiBTC: 'BTC.b',
  'qiBTC.b': 'BTC.b',
  qiETH: 'ETH',
  qiAVAX: 'AVAX',
  qiUSDC: 'USDC',
  qiUSDT: 'USDt',
  qiDAI: 'DAI',
  qiLINK: 'LINK',
};

function normalizeSymbol(rawSymbol: string): string {
  return SYMBOL_NORMALIZATION[rawSymbol] ?? rawSymbol;
}

export interface AssetRiskParam {
  symbol: string;
  liquidationThreshold: number;
  maxLtv: number;
  collateralFactor: number;
  // cToken/aToken to underlying exchange rate. 1 for standard tokens;
  // fetched on-chain for Compound V2 style cTokens (Venus, BENQI).
  exchangeRate: number;
}

export interface ProtocolRiskParamsResult {
  protocolId: string;
  params: AssetRiskParam[];
  source: 'on-chain' | 'fallback' | 'unsupported';
  error?: string;
}

interface AaveReserveConfig {
  symbol: string;
  baseLTVasCollateral: bigint;
  reserveLiquidationThreshold: bigint;
}

async function fetchAaveV3RiskParams(protocol: ProtocolConfig): Promise<ProtocolRiskParamsResult> {
  if (!protocol.contracts?.poolDataProvider || !protocol.contracts.poolAddressesProvider) {
    return buildFallbackResult(protocol, 'Missing Aave V3 contract addresses');
  }

  try {
    const chainId = getChainId(protocol.chain);
    const dataProvider = protocol.contracts.poolDataProvider;
    const provider = protocol.contracts.poolAddressesProvider;

    const aaveCallData = encodeFunctionData({
      abi: IUiPoolDataProvider_ABI,
      functionName: 'getReservesData',
      args: [provider],
    });
    const aaveResult = await readContract(chainId, dataProvider, aaveCallData);
    const [reservesResult] = decodeFunctionResult({
      abi: IUiPoolDataProvider_ABI,
      functionName: 'getReservesData',
      data: aaveResult as `0x${string}`,
    }) as [readonly unknown[], unknown];

    const configBySymbol = new Map<string, AaveReserveConfig>();
    for (const raw of reservesResult) {
      const r = raw as Record<string, unknown>;
      const rawSymbol = String(r.symbol ?? '');
      const symbol = normalizeSymbol(rawSymbol);
      configBySymbol.set(symbol, {
        symbol,
        baseLTVasCollateral: BigInt(r.baseLTVasCollateral as bigint | number | string),
        reserveLiquidationThreshold: BigInt(
          r.reserveLiquidationThreshold as bigint | number | string
        ),
      });
    }

    const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));
    const params: AssetRiskParam[] = [];

    for (const symbol of supportedSymbols) {
      const config = configBySymbol.get(symbol);
      if (!config) continue;

      // Aave values are in basis points (10000 = 100%)
      const maxLtv = Number(config.baseLTVasCollateral) / 10000;
      const liquidationThresholdBp = Number(config.reserveLiquidationThreshold) / 10000;

      // In our registry model: liquidationThreshold = 1 / actualLT
      // e.g. Aave LT=80% => registry liquidationThreshold = 1.25
      const liquidationThreshold = liquidationThresholdBp > 0 ? 1 / liquidationThresholdBp : 0;
      const collateralFactor = maxLtv;

      params.push({
        symbol,
        liquidationThreshold,
        maxLtv,
        collateralFactor,
        // Aave V3 uses aTokens priced in underlying units; exchange rate is 1.
        exchangeRate: 1,
      });
    }

    if (params.length === 0) {
      return buildFallbackResult(protocol, 'No supported asset configs found on-chain');
    }

    return {
      protocolId: protocol.id,
      params,
      source: 'on-chain',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch Aave V3 risk params for ${protocol.id}`, new Error(message));
    return buildFallbackResult(protocol, message);
  }
}

function buildFallbackResult(protocol: ProtocolConfig, error?: string): ProtocolRiskParamsResult {
  return {
    protocolId: protocol.id,
    params: protocol.assets.map((a) => ({
      symbol: a.symbol,
      liquidationThreshold: a.liquidationThreshold,
      maxLtv: a.maxLtv,
      collateralFactor: a.collateralFactor,
      exchangeRate: a.exchangeRate,
    })),
    source: 'fallback',
    error,
  };
}

const COMET_ABI = [
  {
    inputs: [],
    name: 'getConfiguration',
    outputs: [
      {
        components: [
          { name: 'governor', type: 'address' },
          { name: 'pauseGuardian', type: 'address' },
          { name: 'baseToken', type: 'address' },
          { name: 'baseTokenPriceFeed', type: 'address' },
          { name: 'extensionDelegate', type: 'address' },
          { name: 'supplyKink', type: 'uint64' },
          { name: 'borrowKink', type: 'uint64' },
          { name: 'supplyPerYearInterestRateSlopeLow', type: 'uint64' },
          { name: 'supplyPerYearInterestRateSlopeHigh', type: 'uint64' },
          { name: 'borrowPerYearInterestRateSlopeLow', type: 'uint64' },
          { name: 'borrowPerYearInterestRateSlopeHigh', type: 'uint64' },
          { name: 'borrowPerYearInterestRateBase', type: 'uint64' },
          { name: 'storeFrontPriceFactor', type: 'uint64' },
          { name: 'trackingIndexScale', type: 'uint64' },
          { name: 'baseTrackingSupplySpeed', type: 'uint64' },
          { name: 'baseTrackingBorrowSpeed', type: 'uint64' },
          { name: 'baseMinForRewards', type: 'uint104' },
          { name: 'baseBorrowMin', type: 'uint104' },
          { name: 'targetReserves', type: 'uint104' },
          {
            components: [
              { name: 'asset', type: 'address' },
              { name: 'priceFeed', type: 'address' },
              { name: 'decimals', type: 'uint8' },
              { name: 'borrowCollateralFactor', type: 'uint64' },
              { name: 'liquidateCollateralFactor', type: 'uint64' },
              { name: 'liquidationFactor', type: 'uint64' },
              { name: 'supplyCap', type: 'uint128' },
            ],
            name: 'assetConfigs',
            type: 'tuple[]',
          },
        ],
        name: 'config',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const ERC20_SYMBOL_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface CompoundAssetConfig {
  asset: `0x${string}`;
  borrowCollateralFactor: bigint;
  liquidateCollateralFactor: bigint;
}

async function fetchCompoundV3RiskParams(
  protocol: ProtocolConfig
): Promise<ProtocolRiskParamsResult> {
  const comet = protocol.contracts?.comet;
  if (!comet) {
    return buildFallbackResult(protocol, 'Missing Compound V3 Comet address');
  }

  try {
    const chainId = getChainId(protocol.chain);

    const cometCallData = encodeFunctionData({
      abi: COMET_ABI,
      functionName: 'getConfiguration',
    });
    const cometResult = await readContract(chainId, comet, cometCallData);
    const config = decodeFunctionResult({
      abi: COMET_ABI,
      functionName: 'getConfiguration',
      data: cometResult as `0x${string}`,
    }) as unknown as {
      assetConfigs: CompoundAssetConfig[];
      baseToken: `0x${string}`;
    };

    const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));
    const params: AssetRiskParam[] = [];

    // Read symbol for each collateral asset.
    for (const assetConfig of config.assetConfigs) {
      try {
        const symbolCallData = encodeFunctionData({
          abi: ERC20_SYMBOL_ABI,
          functionName: 'symbol',
        });
        const symbolResult = await readContract(chainId, assetConfig.asset, symbolCallData);
        const rawSymbol = decodeFunctionResult({
          abi: ERC20_SYMBOL_ABI,
          functionName: 'symbol',
          data: symbolResult as `0x${string}`,
        }) as string;

        const symbol = normalizeSymbol(rawSymbol);
        if (!supportedSymbols.has(symbol)) continue;

        // Compound V3 factors are 18-decimal mantissas (1e18 = 100%).
        const maxLtv = Number(assetConfig.borrowCollateralFactor) / 1e18;
        const liquidateFactor = Number(assetConfig.liquidateCollateralFactor) / 1e18;

        // Registry model: liquidationThreshold = 1 / actualLiquidationThreshold.
        // e.g. liquidateFactor=86% => registry liquidationThreshold ≈ 1.1628.
        const liquidationThreshold = liquidateFactor > 0 ? 1 / liquidateFactor : 0;
        const collateralFactor = maxLtv;

        params.push({
          symbol,
          liquidationThreshold,
          maxLtv,
          collateralFactor,
          // Compound V3 uses direct collateral tokens; exchange rate is 1.
          exchangeRate: 1,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed to read Compound V3 asset symbol for ${protocol.id} ${assetConfig.asset}`,
          new Error(message)
        );
      }
    }

    if (params.length === 0) {
      return buildFallbackResult(protocol, 'No supported asset configs found on-chain');
    }

    return {
      protocolId: protocol.id,
      params,
      source: 'on-chain',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch Compound V3 risk params for ${protocol.id}`, new Error(message));
    return buildFallbackResult(protocol, message);
  }
}

// Compound V2 style ABI (Venus, BENQI)
const COMPTROLLER_ABI = [
  {
    inputs: [],
    name: 'getAllMarkets',
    outputs: [{ name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'vToken', type: 'address' }],
    name: 'markets',
    outputs: [
      { name: 'isListed', type: 'bool' },
      { name: 'collateralFactorMantissa', type: 'uint256' },
      { name: 'isVenus', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CTOKEN_UNDERLYING_ABI = [
  {
    inputs: [],
    name: 'underlying',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

const CTOKEN_EXCHANGE_RATE_ABI = [
  {
    inputs: [],
    name: 'exchangeRateCurrent',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

async function fetchCompoundV2RiskParams(
  protocol: ProtocolConfig,
  type: 'venus' | 'benqi'
): Promise<ProtocolRiskParamsResult> {
  const comptroller = protocol.contracts?.comptroller;
  if (!comptroller) {
    return buildFallbackResult(protocol, `Missing ${type} comptroller address`);
  }

  try {
    const chainId = getChainId(protocol.chain);

    const marketsCallData = encodeFunctionData({
      abi: COMPTROLLER_ABI,
      functionName: 'getAllMarkets',
    });
    const marketsResult = await readContract(chainId, comptroller, marketsCallData);
    const markets = decodeFunctionResult({
      abi: COMPTROLLER_ABI,
      functionName: 'getAllMarkets',
      data: marketsResult as `0x${string}`,
    }) as `0x${string}`[];

    const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));
    const params: AssetRiskParam[] = [];

    const marketResults = await Promise.allSettled(
      markets.map(async (market) => {
        try {
          const marketCallData = encodeFunctionData({
            abi: COMPTROLLER_ABI,
            functionName: 'markets',
            args: [market],
          });
          const marketResult = await readContract(chainId, comptroller, marketCallData);
          const [, collateralFactorMantissa] = decodeFunctionResult({
            abi: COMPTROLLER_ABI,
            functionName: 'markets',
            data: marketResult as `0x${string}`,
          }) as [boolean, bigint, boolean];

          // Try to read underlying; native market tokens (vBNB, qiAVAX) revert.
          let underlyingAddress: `0x${string}` | null = null;
          try {
            const underlyingCallData = encodeFunctionData({
              abi: CTOKEN_UNDERLYING_ABI,
              functionName: 'underlying',
            });
            const underlyingResult = await readContract(chainId, market, underlyingCallData);
            underlyingAddress = decodeFunctionResult({
              abi: CTOKEN_UNDERLYING_ABI,
              functionName: 'underlying',
              data: underlyingResult as `0x${string}`,
            }) as `0x${string}`;
          } catch {
            underlyingAddress = null;
          }

          const symbolSource = underlyingAddress ?? market;
          const symbolCallData = encodeFunctionData({
            abi: ERC20_SYMBOL_ABI,
            functionName: 'symbol',
          });
          const symbolResult = await readContract(chainId, symbolSource, symbolCallData);
          const rawSymbol = decodeFunctionResult({
            abi: ERC20_SYMBOL_ABI,
            functionName: 'symbol',
            data: symbolResult as `0x${string}`,
          }) as string;

          // Read cToken exchange rate (cToken -> underlying). Reverts for some
          // markets are treated as 1 (standard token / already in underlying units).
          let exchangeRateMantissa = 0n;
          try {
            const exchangeRateCallData = encodeFunctionData({
              abi: CTOKEN_EXCHANGE_RATE_ABI,
              functionName: 'exchangeRateCurrent',
            });
            const exchangeRateResult = await readContract(chainId, market, exchangeRateCallData);
            exchangeRateMantissa = decodeFunctionResult({
              abi: CTOKEN_EXCHANGE_RATE_ABI,
              functionName: 'exchangeRateCurrent',
              data: exchangeRateResult as `0x${string}`,
            }) as bigint;
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(
              `Failed to read ${type} exchange rate for ${market}, defaulting to 1`,
              new Error(message)
            );
            exchangeRateMantissa = 10n ** 18n;
          }

          const symbol = normalizeSymbol(rawSymbol);
          return {
            symbol,
            collateralFactorMantissa,
            exchangeRateMantissa,
            market,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn(`Failed to read ${type} market ${market}`, new Error(message));
          return null;
        }
      })
    );

    const seenSymbols = new Set<string>();
    for (const result of marketResults) {
      if (result.status !== 'fulfilled' || !result.value) continue;
      const { symbol, collateralFactorMantissa, exchangeRateMantissa } = result.value;
      if (!supportedSymbols.has(symbol) || seenSymbols.has(symbol)) continue;

      seenSymbols.add(symbol);

      // Compound V2 collateral factor is an 18-decimal mantissa.
      const collateralFactor = Number(collateralFactorMantissa) / 1e18;
      const maxLtv = collateralFactor;
      // In Compound V2 style protocols, liquidation threshold = collateral factor.
      // Registry model uses the reciprocal: liquidationThreshold = 1 / CF.
      const liquidationThreshold = collateralFactor > 0 ? 1 / collateralFactor : 0;
      // cToken exchange rate is an 18-decimal mantissa (1e18 = 1:1).
      const exchangeRate = exchangeRateMantissa > 0n ? Number(exchangeRateMantissa) / 1e18 : 1;

      params.push({
        symbol,
        liquidationThreshold,
        maxLtv,
        collateralFactor,
        exchangeRate,
      });
    }

    if (params.length === 0) {
      return buildFallbackResult(protocol, 'No supported asset configs found on-chain');
    }

    return {
      protocolId: protocol.id,
      params,
      source: 'on-chain',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch ${type} risk params for ${protocol.id}`, new Error(message));
    return buildFallbackResult(protocol, message);
  }
}

const MORPHO_CREATE_MARKET_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'id', type: 'bytes32' },
      {
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
        indexed: false,
        name: 'marketParams',
        type: 'tuple',
      },
    ],
    name: 'CreateMarket',
    type: 'event',
  },
] as const;

const MORPHO_CREATE_MARKET_TOPIC = getEventSelector(
  'CreateMarket(bytes32,(address,address,address,address,uint256))'
);

async function readTokenSymbol(chainId: number, token: `0x${string}`): Promise<string | null> {
  try {
    const symbolCallData = encodeFunctionData({
      abi: ERC20_SYMBOL_ABI,
      functionName: 'symbol',
    });
    const symbolResult = await readContract(chainId, token, symbolCallData);
    return decodeFunctionResult({
      abi: ERC20_SYMBOL_ABI,
      functionName: 'symbol',
      data: symbolResult as `0x${string}`,
    }) as string;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to read token symbol ${token}`, new Error(message));
    return null;
  }
}

async function fetchMorphoBlueRiskParams(
  protocol: ProtocolConfig
): Promise<ProtocolRiskParamsResult> {
  const morpho = protocol.contracts?.morpho;
  if (!morpho) {
    return buildFallbackResult(protocol, 'Missing Morpho Blue contract address');
  }

  try {
    const chainId = getChainId(protocol.chain);

    // Morpho Blue market params are immutable and emitted in CreateMarket events.
    // We replay these logs to reconstruct the collateral token -> LLTV mapping.
    const logs = await getLogs(chainId, {
      address: morpho,
      fromBlock: 'earliest',
      toBlock: 'latest',
      topics: [MORPHO_CREATE_MARKET_TOPIC],
    });

    const supportedSymbols = new Set(protocol.assets.map((a) => a.symbol));
    const markets: { collateralToken: `0x${string}`; lltv: bigint }[] = [];

    for (const log of logs) {
      try {
        const rawLog = log as { topics: string[]; data: string };
        const decoded = decodeEventLog({
          abi: MORPHO_CREATE_MARKET_ABI,
          data: rawLog.data as `0x${string}`,
          topics: rawLog.topics as [`0x${string}`, ...`0x${string}`[]],
          eventName: 'CreateMarket',
        });
        const params = decoded.args.marketParams as {
          loanToken: `0x${string}`;
          collateralToken: `0x${string}`;
          oracle: `0x${string}`;
          irm: `0x${string}`;
          lltv: bigint;
        };
        markets.push({ collateralToken: params.collateralToken, lltv: params.lltv });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(
          `Failed to decode Morpho CreateMarket log for ${protocol.id}`,
          new Error(message)
        );
      }
    }

    // Read each unique collateral token symbol once.
    const uniqueCollateralTokens = [...new Set(markets.map((m) => m.collateralToken))];
    const symbolResults = await Promise.allSettled(
      uniqueCollateralTokens.map(async (token) => {
        const symbol = await readTokenSymbol(chainId, token);
        return { token, symbol: symbol ? normalizeSymbol(symbol) : null };
      })
    );

    const symbolByToken = new Map<`0x${string}`, string>();
    for (const result of symbolResults) {
      if (result.status !== 'fulfilled' || !result.value.symbol) continue;
      symbolByToken.set(result.value.token, result.value.symbol);
    }

    // Keep the highest LLTV per supported collateral symbol to match registry defaults.
    const lltvBySymbol = new Map<string, bigint>();
    for (const { collateralToken, lltv } of markets) {
      const symbol = symbolByToken.get(collateralToken);
      if (!symbol || !supportedSymbols.has(symbol)) continue;
      const current = lltvBySymbol.get(symbol);
      if (!current || lltv > current) {
        lltvBySymbol.set(symbol, lltv);
      }
    }

    const params: AssetRiskParam[] = [];
    for (const symbol of supportedSymbols) {
      const lltv = lltvBySymbol.get(symbol);
      if (!lltv) continue;

      // LLTV is an 18-decimal mantissa (1e18 = 100%).
      const maxLtv = Number(lltv) / 1e18;
      // Registry model: liquidationThreshold = 1 / LLTV.
      const liquidationThreshold = maxLtv > 0 ? 1 / maxLtv : 0;
      const collateralFactor = maxLtv;

      params.push({
        symbol,
        liquidationThreshold,
        maxLtv,
        collateralFactor,
        // Morpho Blue uses direct loan/collateral tokens; exchange rate is 1.
        exchangeRate: 1,
      });
    }

    if (params.length === 0) {
      return buildFallbackResult(protocol, 'No supported Morpho market configs found on-chain');
    }

    return {
      protocolId: protocol.id,
      params,
      source: 'on-chain',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`Failed to fetch Morpho Blue risk params for ${protocol.id}`, new Error(message));
    return buildFallbackResult(protocol, message);
  }
}

async function fetchProtocolRiskParams(
  protocol: ProtocolConfig
): Promise<ProtocolRiskParamsResult> {
  try {
    if (protocol.id.startsWith('aave-v3')) {
      return await fetchAaveV3RiskParams(protocol);
    }
    if (protocol.id.startsWith('compound-v3')) {
      return await fetchCompoundV3RiskParams(protocol);
    }
    if (protocol.id.startsWith('morpho-blue')) {
      return await fetchMorphoBlueRiskParams(protocol);
    }
    if (protocol.id === 'venus-bnb-chain') {
      return await fetchCompoundV2RiskParams(protocol, 'venus');
    }
    if (protocol.id === 'benqi-avalanche') {
      return await fetchCompoundV2RiskParams(protocol, 'benqi');
    }

    return {
      protocolId: protocol.id,
      params: [],
      source: 'unsupported',
      error: 'On-chain risk param fetch not supported for this protocol type',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Unexpected error fetching risk params for ${protocol.id}`, new Error(message));
    return buildFallbackResult(protocol, message);
  }
}

// Bound parallel on-chain RPC fetches so concurrent protocols don't
// saturate RPC provider rate limits. Each protocol internally fans out
// to multiple contract reads (markets, symbols, exchange rates), so a
// modest concurrency keeps total RPC volume manageable while still
// cutting total wall-time vs. a fully sequential loop.
const RISK_PARAMS_FETCH_CONCURRENCY = 3;

export async function fetchAllProtocolRiskParams(): Promise<ProtocolRiskParamsResult[]> {
  const lendingProtocols = PROTOCOL_REGISTRY.filter((p) => p.protocolType === 'lending');

  return mapWithConcurrency(lendingProtocols, RISK_PARAMS_FETCH_CONCURRENCY, (protocol) =>
    fetchProtocolRiskParams(protocol)
  );
}
