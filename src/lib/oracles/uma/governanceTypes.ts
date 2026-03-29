export interface GovernanceProposal {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'passed' | 'rejected' | 'pending';
  proposer: string;
  startBlock: number;
  endBlock: number;
  forVotes: number;
  againstVotes: number;
  quorum: number;
  votingPower: number;
  category: 'parameter' | 'upgrade' | 'treasury' | 'other';
}

export interface VoteRecord {
  voter: string;
  vote: 'for' | 'against';
  votingPower: number;
  timestamp: number;
}

export interface VotingWeightDistribution {
  holder: string;
  votingPower: number;
  percentage: number;
  isDelegated: boolean;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  totalVotingPower: number;
  avgParticipation: number;
  quorumThreshold: number;
}

export interface ProposalCategoryConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PROPOSAL_CATEGORY_CONFIG: Record<
  GovernanceProposal['category'],
  ProposalCategoryConfig
> = {
  parameter: {
    label: 'uma.governance.category.parameter',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  upgrade: {
    label: 'uma.governance.category.upgrade',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  treasury: {
    label: 'uma.governance.category.treasury',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  other: {
    label: 'uma.governance.category.other',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

export const PROPOSAL_STATUS_CONFIG: Record<
  GovernanceProposal['status'],
  { label: string; color: string; bgColor: string }
> = {
  active: {
    label: 'uma.governance.status.active',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
  },
  passed: {
    label: 'uma.governance.status.passed',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
  },
  rejected: {
    label: 'uma.governance.status.rejected',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
  },
  pending: {
    label: 'uma.governance.status.pending',
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
  },
};
