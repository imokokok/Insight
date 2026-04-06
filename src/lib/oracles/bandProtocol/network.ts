import { createLogger } from '@/lib/utils/logger';

import { getLatestBlockHeight, getBlock } from './blocks';

import type { BandNetworkStats, BandProtocolMarketData, StakingInfo, BlockInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandNetwork');

interface StakingPoolResult {
  pool: {
    not_bonded_tokens: string;
    bonded_tokens: string;
  };
}

interface MintingParamsResult {
  params: {
    mint_denom: string;
    inflation_rate_change: string;
    inflation_max: string;
    inflation_min: string;
    goal_bonded: string;
    blocks_per_year: string;
  };
}

interface SupplyResult {
  supply: Array<{
    denom: string;
    amount: string;
  }>;
}

interface CommunityPoolResult {
  pool: Array<{
    denom: string;
    amount: string;
  }>;
}

export async function getNetworkStats(
  makeRestCall: RestCallFunction,
  getBlockInfo: () => Promise<BlockInfo>
): Promise<BandNetworkStats> {
  try {
    const [blockResult, stakingPool, mintingParams, supply, communityPool] = await Promise.all([
      getBlockInfo(),
      makeRestCall<StakingPoolResult>('/cosmos/staking/v1beta1/pool'),
      makeRestCall<MintingParamsResult>('/cosmos/mint/v1beta1/params'),
      makeRestCall<SupplyResult>('/cosmos/bank/v1beta1/supply'),
      makeRestCall<CommunityPoolResult>('/cosmos/distribution/v1beta1/community_pool'),
    ]);

    const bondedTokens = parseFloat(stakingPool.pool.bonded_tokens) / 1e6;
    const totalSupply = supply.supply.find((s) => s.denom === 'uband')?.amount || '0';
    const totalSupplyBand = parseFloat(totalSupply) / 1e6;
    const communityPoolBand = communityPool.pool.find((p) => p.denom === 'uband')?.amount || '0';

    const validatorsResult = await makeRestCall<{
      validators: unknown[];
      pagination: { total: string };
    }>('/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=1');
    const activeValidators = parseInt(validatorsResult.pagination.total, 10);

    const allValidatorsResult = await makeRestCall<{
      validators: unknown[];
      pagination: { total: string };
    }>('/cosmos/staking/v1beta1/validators?pagination.limit=1');
    const totalValidators = parseInt(allValidatorsResult.pagination.total, 10);

    return {
      activeValidators,
      totalValidators,
      bondedTokens,
      totalSupply: totalSupplyBand,
      stakingRatio: totalSupplyBand > 0 ? (bondedTokens / totalSupplyBand) * 100 : 0,
      blockTime: 2.8,
      latestBlockHeight: blockResult.height,
      inflationRate: parseFloat(mintingParams.params.inflation_max) * 100,
      communityPool: parseFloat(communityPoolBand) / 1e6,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(
      'Failed to get network stats',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getMarketData(
  makeRestCall: RestCallFunction,
  getNetworkStatsFn: () => Promise<BandNetworkStats>
): Promise<BandProtocolMarketData> {
  try {
    const [networkStats, supply] = await Promise.all([
      getNetworkStatsFn(),
      makeRestCall<SupplyResult>('/cosmos/bank/v1beta1/supply'),
    ]);

    const totalSupply = supply.supply.find((s) => s.denom === 'uband')?.amount || '0';
    const totalSupplyBand = parseFloat(totalSupply) / 1e6;

    return {
      symbol: 'BAND',
      price: 0,
      priceChange24h: 0,
      priceChangePercentage24h: 0,
      marketCap: 0,
      volume24h: 0,
      circulatingSupply: totalSupplyBand,
      totalSupply: totalSupplyBand,
      maxSupply: 250_000_000,
      stakingRatio: networkStats.stakingRatio,
      stakingApr: 0,
      timestamp: Date.now(),
    };
  } catch (error) {
    logger.error(
      'Failed to get market data',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getStakingInfo(makeRestCall: RestCallFunction): Promise<StakingInfo> {
  try {
    const [stakingPool, mintingParams, supply, communityPool] = await Promise.all([
      makeRestCall<StakingPoolResult>('/cosmos/staking/v1beta1/pool'),
      makeRestCall<MintingParamsResult>('/cosmos/mint/v1beta1/params'),
      makeRestCall<SupplyResult>('/cosmos/bank/v1beta1/supply'),
      makeRestCall<CommunityPoolResult>('/cosmos/distribution/v1beta1/community_pool'),
    ]);

    const bondedTokens = parseFloat(stakingPool.pool.bonded_tokens) / 1e6;
    const totalSupply = supply.supply.find((s) => s.denom === 'uband')?.amount || '0';
    const totalSupplyBand = parseFloat(totalSupply) / 1e6;
    const communityPoolBand = communityPool.pool.find((p) => p.denom === 'uband')?.amount || '0';

    return {
      totalStaked: bondedTokens,
      stakingRatio: totalSupplyBand > 0 ? (bondedTokens / totalSupplyBand) * 100 : 0,
      stakingAPR: parseFloat(mintingParams.params.inflation_max) * 100,
      unbondingPeriod: 21,
      minStake: 1,
      slashingRate: 0.01,
      communityPool: parseFloat(communityPoolBand) / 1e6,
      inflation: parseFloat(mintingParams.params.inflation_max) * 100,
    };
  } catch (error) {
    logger.error(
      'Failed to get staking info',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
