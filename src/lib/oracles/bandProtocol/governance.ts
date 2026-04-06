import { createLogger } from '@/lib/utils/logger';

import type { GovernanceProposal, GovernanceParams } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandGovernance');

interface ProposalsResult {
  proposals: Array<{
    proposal_id: string;
    content: {
      '@type': string;
      title: string;
      description: string;
    };
    status: string;
    final_tally_result: {
      yes: string;
      abstain: string;
      no: string;
      no_with_veto: string;
    };
    submit_time: string;
    deposit_end_time: string;
    total_deposit: Array<{
      denom: string;
      amount: string;
    }>;
    voting_start_time: string;
    voting_end_time: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface ProposalVotesResult {
  votes: Array<{
    proposal_id: string;
    voter: string;
    option: string;
    options: Array<{
      option: string;
      weight: string;
    }>;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

export async function getProposals(
  makeRestCall: RestCallFunction,
  status?: string
): Promise<GovernanceProposal[]> {
  try {
    let endpoint = '/cosmos/gov/v1beta1/proposals';
    if (status) {
      endpoint += `?proposal_status=${status}`;
    }

    const result = await makeRestCall<ProposalsResult>(endpoint);

    const statusMap: Record<string, 'deposit' | 'voting' | 'passed' | 'rejected' | 'failed'> = {
      PROPOSAL_STATUS_DEPOSIT_PERIOD: 'deposit',
      PROPOSAL_STATUS_VOTING_PERIOD: 'voting',
      PROPOSAL_STATUS_PASSED: 'passed',
      PROPOSAL_STATUS_REJECTED: 'rejected',
      PROPOSAL_STATUS_FAILED: 'failed',
    };

    return result.proposals.map((p) => {
      const yes = parseInt(p.final_tally_result.yes, 10);
      const no = parseInt(p.final_tally_result.no, 10);
      const abstain = parseInt(p.final_tally_result.abstain, 10);
      const noWithVeto = parseInt(p.final_tally_result.no_with_veto, 10);

      return {
        id: parseInt(p.proposal_id, 10),
        title: p.content.title,
        description: p.content.description,
        type: p.content['@type'].split('.').pop() || 'Unknown',
        status: statusMap[p.status] || 'deposit',
        submitTime: new Date(p.submit_time).getTime(),
        depositEndTime: new Date(p.deposit_end_time).getTime(),
        votingEndTime: new Date(p.voting_end_time).getTime(),
        proposer: '',
        totalDeposit: p.total_deposit.reduce((sum, d) => sum + parseInt(d.amount, 10), 0) / 1e6,
        votes: {
          yes,
          no,
          abstain,
          noWithVeto,
        },
      };
    });
  } catch (error) {
    logger.error(
      'Failed to get proposals',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getProposalVotes(
  makeRestCall: RestCallFunction,
  proposalId: number,
  limit: number = 100
): Promise<Array<{ voter: string; option: string; weight: string }>> {
  try {
    const result = await makeRestCall<ProposalVotesResult>(
      `/cosmos/gov/v1beta1/proposals/${proposalId}/votes?pagination.limit=${limit}`
    );

    return result.votes.map((v) => ({
      voter: v.voter,
      option: v.option,
      weight: v.options[0]?.weight || '1',
    }));
  } catch (error) {
    logger.error(
      'Failed to get proposal votes',
      error instanceof Error ? error : new Error(String(error)),
      { proposalId }
    );
    throw error;
  }
}

export async function getGovernanceParams(
  makeRestCall: RestCallFunction
): Promise<GovernanceParams> {
  try {
    await makeRestCall<{
      voting_params: { voting_period: string };
      deposit_params: {
        min_deposit: Array<{ denom: string; amount: string }>;
        max_deposit_period: string;
      };
      tally_params: { quorum: string; threshold: string; veto_threshold: string };
    }>('/cosmos/gov/v1beta1/params/voting');

    const depositResult = await makeRestCall<{
      deposit_params: {
        min_deposit: Array<{ denom: string; amount: string }>;
        max_deposit_period: string;
      };
    }>('/cosmos/gov/v1beta1/params/deposit');

    const tallyResult = await makeRestCall<{
      tally_params: { quorum: string; threshold: string; veto_threshold: string };
    }>('/cosmos/gov/v1beta1/params/tallying');

    const minDeposit = depositResult.deposit_params.min_deposit.find((d) => d.denom === 'uband');

    return {
      minDeposit: minDeposit ? parseInt(minDeposit.amount, 10) / 1e6 : 1000,
      maxDepositPeriod: 172800,
      votingPeriod: 604800,
      quorum: parseFloat(tallyResult.tally_params.quorum) * 100,
      threshold: parseFloat(tallyResult.tally_params.threshold) * 100,
      vetoThreshold: parseFloat(tallyResult.tally_params.veto_threshold) * 100,
    };
  } catch (error) {
    logger.error(
      'Failed to get governance params',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
