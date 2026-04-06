import { createLogger } from '@/lib/utils/logger';

import type { AccountInfo, DelegationInfo, RewardInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandAccount');

interface AccountResult {
  account: {
    '@type': string;
    address: string;
    pub_key?: {
      '@type': string;
      key: string;
    };
    account_number: string;
    sequence: string;
  };
}

interface BalanceResult {
  balances: Array<{
    denom: string;
    amount: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface DelegatorDelegationsResult {
  delegation_responses: Array<{
    delegation: {
      delegator_address: string;
      validator_address: string;
      shares: string;
    };
    balance: {
      denom: string;
      amount: string;
    };
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface DelegatorRewardsResult {
  rewards: Array<{
    validator_address: string;
    reward: Array<{
      denom: string;
      amount: string;
    }>;
  }>;
  total: Array<{
    denom: string;
    amount: string;
  }>;
}

export async function getAccountInfo(
  makeRestCall: RestCallFunction,
  address: string
): Promise<AccountInfo> {
  try {
    const [account, balance] = await Promise.all([
      makeRestCall<AccountResult>(`/cosmos/auth/v1beta1/accounts/${address}`),
      makeRestCall<BalanceResult>(`/cosmos/bank/v1beta1/balances/${address}`),
    ]);

    return {
      address: account.account.address,
      accountNumber: parseInt(account.account.account_number, 10),
      sequence: parseInt(account.account.sequence, 10),
      balances: balance.balances.map((b) => ({
        denom: b.denom,
        amount: parseFloat(b.amount) / 1e6,
      })),
    };
  } catch (error) {
    logger.error(
      'Failed to get account info',
      error instanceof Error ? error : new Error(String(error)),
      { address }
    );
    throw error;
  }
}

export async function getAccountBalance(
  makeRestCall: RestCallFunction,
  address: string
): Promise<Array<{ denom: string; amount: number }>> {
  try {
    const result = await makeRestCall<BalanceResult>(`/cosmos/bank/v1beta1/balances/${address}`);

    return result.balances.map((b) => ({
      denom: b.denom,
      amount: parseFloat(b.amount) / 1e6,
    }));
  } catch (error) {
    logger.error(
      'Failed to get account balance',
      error instanceof Error ? error : new Error(String(error)),
      { address }
    );
    throw error;
  }
}

export async function getDelegatorDelegations(
  makeRestCall: RestCallFunction,
  delegatorAddress: string
): Promise<DelegationInfo[]> {
  try {
    const result = await makeRestCall<DelegatorDelegationsResult>(
      `/cosmos/staking/v1beta1/delegations/${delegatorAddress}`
    );

    return result.delegation_responses.map((d) => ({
      delegatorAddress: d.delegation.delegator_address,
      validatorAddress: d.delegation.validator_address,
      shares: parseFloat(d.delegation.shares) / 1e6,
      balance: parseFloat(d.balance.amount) / 1e6,
    }));
  } catch (error) {
    logger.error(
      'Failed to get delegator delegations',
      error instanceof Error ? error : new Error(String(error)),
      { delegatorAddress }
    );
    throw error;
  }
}

export async function getDelegatorRewards(
  makeRestCall: RestCallFunction,
  delegatorAddress: string
): Promise<RewardInfo[]> {
  try {
    const result = await makeRestCall<DelegatorRewardsResult>(
      `/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`
    );

    return result.rewards.map((r) => ({
      validatorAddress: r.validator_address,
      rewards: r.reward.map((reward) => ({
        denom: reward.denom,
        amount: parseFloat(reward.amount) / 1e6,
      })),
    }));
  } catch (error) {
    logger.error(
      'Failed to get delegator rewards',
      error instanceof Error ? error : new Error(String(error)),
      { delegatorAddress }
    );
    throw error;
  }
}
