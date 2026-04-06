import { createLogger } from '@/lib/utils/logger';

import type { ValidatorInfo, DelegationInfo } from './types';

const logger = createLogger('BandValidators');

interface ValidatorResult {
  validators: Array<{
    operator_address: string;
    consensus_pubkey: {
      '@type': string;
      key: string;
    };
    jailed: boolean;
    status: string;
    tokens: string;
    delegator_shares: string;
    description: {
      moniker: string;
      identity: string;
      website: string;
      details: string;
    };
    commission: {
      commission_rates: {
        rate: string;
        max_rate: string;
        max_change_rate: string;
      };
    };
    min_self_delegation: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface ValidatorDelegationsResult {
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

export type RestCallFunction = <T>(endpoint: string) => Promise<T>;

export async function getValidators(
  makeRestCall: RestCallFunction,
  limit: number = 100
): Promise<ValidatorInfo[]> {
  try {
    const result = await makeRestCall<ValidatorResult>(
      `/cosmos/staking/v1beta1/validators?pagination.limit=${limit}&status=BOND_STATUS_BONDED`
    );

    return result.validators.map((v, index) => ({
      operatorAddress: v.operator_address,
      moniker: v.description.moniker || `Validator ${index + 1}`,
      identity: v.description.identity || '',
      website: v.description.website || '',
      details: v.description.details || '',
      tokens: parseFloat(v.tokens) / 1e6,
      delegatorShares: parseFloat(v.delegator_shares) / 1e6,
      commissionRate: parseFloat(v.commission.commission_rates.rate),
      maxCommissionRate: parseFloat(v.commission.commission_rates.max_rate),
      maxCommissionChangeRate: parseFloat(v.commission.commission_rates.max_change_rate),
      uptime: 0,
      jailed: v.jailed,
      rank: index + 1,
    }));
  } catch (error) {
    logger.error(
      'Failed to get validators',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getValidatorDelegations(
  makeRestCall: RestCallFunction,
  validatorAddress: string,
  limit: number = 100
): Promise<DelegationInfo[]> {
  try {
    const result = await makeRestCall<ValidatorDelegationsResult>(
      `/cosmos/staking/v1beta1/validators/${validatorAddress}/delegations?pagination.limit=${limit}`
    );

    return result.delegation_responses.map((d) => ({
      delegatorAddress: d.delegation.delegator_address,
      validatorAddress: d.delegation.validator_address,
      shares: parseFloat(d.delegation.shares) / 1e6,
      balance: parseFloat(d.balance.amount) / 1e6,
    }));
  } catch (error) {
    logger.error(
      'Failed to get validator delegations',
      error instanceof Error ? error : new Error(String(error)),
      { validatorAddress }
    );
    throw error;
  }
}
