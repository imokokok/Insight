import { MOCK_DATA_STATUS } from '../api3MockDataAnnotations';

import type { AnnotatedData, CoveragePoolEvent, CoveragePoolClaim } from './types';

export async function getCoveragePoolEvents(): Promise<AnnotatedData<CoveragePoolEvent[]>> {
  const events: CoveragePoolEvent[] = [];
  const baseTime = Date.now();

  events.push({
    id: 'evt-001',
    type: 'reward_distribution',
    timestamp: new Date(baseTime - 3600000),
    amount: 12500,
    status: 'completed',
    txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
    description: 'Weekly staking rewards distributed to coverage pool stakers',
  });

  events.push({
    id: 'evt-002',
    type: 'claim',
    timestamp: new Date(baseTime - 86400000),
    amount: 50000,
    status: 'approved',
    txHash: '0xdef456abc789012345678901234567890abcdef1234567890abcdef123456789',
    description: 'Price deviation claim for BTC/USD feed on Arbitrum',
  });

  events.push({
    id: 'evt-003',
    type: 'parameter_change',
    timestamp: new Date(baseTime - 172800000),
    status: 'completed',
    txHash: '0x123abc456def78901234567890123456789abcdef1234567890abcdef123456',
    description: 'Coverage ratio threshold updated from 0.30 to 0.34',
  });

  events.push({
    id: 'evt-004',
    type: 'reward_distribution',
    timestamp: new Date(baseTime - 259200000),
    amount: 11800,
    status: 'completed',
    txHash: '0x456def789abc012345678901234567890abcdef1234567890abcdef123456789',
    description: 'Weekly staking rewards distributed to coverage pool stakers',
  });

  events.push({
    id: 'evt-005',
    type: 'claim',
    timestamp: new Date(baseTime - 345600000),
    amount: 25000,
    status: 'rejected',
    txHash: '0x789abc012def345678901234567890abcdef1234567890abcdef123456789012',
    description: 'Invalid claim for ETH/USD feed - deviation within acceptable range',
  });

  events.push({
    id: 'evt-006',
    type: 'parameter_change',
    timestamp: new Date(baseTime - 432000000),
    status: 'completed',
    txHash: '0xabc012345def678901234567890abcdef1234567890abcdef123456789012345',
    description: 'Staking APR adjusted from 11.8% to 12.5%',
  });

  events.push({
    id: 'evt-007',
    type: 'claim',
    timestamp: new Date(baseTime - 518400000),
    amount: 75000,
    status: 'completed',
    txHash: '0xdef789012abc345678901234567890abcdef1234567890abcdef123456789012',
    description: 'Major claim for SOL/USD feed manipulation incident',
  });

  events.push({
    id: 'evt-008',
    type: 'reward_distribution',
    timestamp: new Date(baseTime - 604800000),
    amount: 11200,
    status: 'completed',
    txHash: '0x012345def789abc678901234567890abcdef1234567890abcdef123456789012',
    description: 'Weekly staking rewards distributed to coverage pool stakers',
  });

  events.push({
    id: 'evt-009',
    type: 'parameter_change',
    timestamp: new Date(baseTime - 691200000),
    status: 'completed',
    txHash: '0x345678def012abc901234567890abcdef1234567890abcdef123456789012345',
    description: 'Claim review period extended from 24h to 48h',
  });

  events.push({
    id: 'evt-010',
    type: 'claim',
    timestamp: new Date(baseTime - 777600000),
    amount: 15000,
    status: 'pending',
    txHash: '0x678901def234abc5678901234567890abcdef1234567890abcdef123456789012',
    description: 'Pending claim for LINK/USD feed latency issue',
  });

  events.push({
    id: 'evt-011',
    type: 'reward_distribution',
    timestamp: new Date(baseTime - 864000000),
    amount: 10500,
    status: 'completed',
    txHash: '0x901234def567abc8901234567890abcdef1234567890abcdef123456789012345',
    description: 'Weekly staking rewards distributed to coverage pool stakers',
  });

  events.push({
    id: 'evt-012',
    type: 'parameter_change',
    timestamp: new Date(baseTime - 950400000),
    status: 'completed',
    txHash: '0x234567def890abc1234567890abcdef1234567890abcdef123456789012345678',
    description: 'Minimum stake amount reduced from 1000 to 500 API3',
  });

  events.push({
    id: 'evt-013',
    type: 'claim',
    timestamp: new Date(baseTime - 1036800000),
    amount: 35000,
    status: 'approved',
    txHash: '0x567890def123abc45678901234567890abcdef1234567890abcdef123456789012',
    description: 'Approved claim for MATIC/USD feed during network congestion',
  });

  events.push({
    id: 'evt-014',
    type: 'reward_distribution',
    timestamp: new Date(baseTime - 1123200000),
    amount: 9800,
    status: 'completed',
    txHash: '0x890123def456abc78901234567890abcdef1234567890abcdef123456789012345',
    description: 'Weekly staking rewards distributed to coverage pool stakers',
  });

  events.push({
    id: 'evt-015',
    type: 'parameter_change',
    timestamp: new Date(baseTime - 1209600000),
    status: 'completed',
    txHash: '0x123456def789abc01234567890abcdef1234567890abcdef123456789012345678',
    description: 'Coverage pool collateralization target increased to 150%',
  });

  return {
    data: events,
    annotation: MOCK_DATA_STATUS.coveragePoolEvents,
  };
}

export async function getCoveragePoolClaims(status?: string): Promise<CoveragePoolClaim[]> {
  const allClaims: CoveragePoolClaim[] = [
    {
      id: 'claim-001',
      type: 'pending',
      amount: 50000,
      requester: '0x1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T',
      reason:
        'Price deviation claim for BTC/USD feed on Arbitrum - deviation exceeded 2% threshold',
      submittedAt: new Date(Date.now() - 86400000 * 2),
      votingDeadline: new Date(Date.now() + 86400000),
      votesFor: 1250000,
      votesAgainst: 320000,
    },
    {
      id: 'claim-002',
      type: 'processing',
      amount: 25000,
      requester: '0x2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U',
      reason: 'ETH/USD feed manipulation incident during high volatility period',
      submittedAt: new Date(Date.now() - 86400000 * 5),
      processedAt: new Date(Date.now() - 86400000),
      transactionHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
      votesFor: 2100000,
      votesAgainst: 180000,
    },
    {
      id: 'claim-003',
      type: 'approved',
      amount: 75000,
      requester: '0x3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
      reason: 'SOL/USD feed manipulation incident - confirmed malicious activity',
      submittedAt: new Date(Date.now() - 86400000 * 15),
      processedAt: new Date(Date.now() - 86400000 * 10),
      transactionHash: '0xdef456abc789012345678901234567890abcdef1234567890abcdef123456789',
      votesFor: 3500000,
      votesAgainst: 45000,
    },
    {
      id: 'claim-004',
      type: 'rejected',
      amount: 15000,
      requester: '0x4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W',
      reason: 'Invalid claim for LINK/USD feed - deviation within acceptable range',
      submittedAt: new Date(Date.now() - 86400000 * 20),
      processedAt: new Date(Date.now() - 86400000 * 18),
      votesFor: 280000,
      votesAgainst: 2850000,
    },
    {
      id: 'claim-005',
      type: 'approved',
      amount: 35000,
      requester: '0x5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X',
      reason: 'MATIC/USD feed during network congestion - delayed price updates',
      submittedAt: new Date(Date.now() - 86400000 * 30),
      processedAt: new Date(Date.now() - 86400000 * 25),
      transactionHash: '0x123abc456def78901234567890123456789abcdef1234567890abcdef123456',
      votesFor: 1890000,
      votesAgainst: 95000,
    },
    {
      id: 'claim-006',
      type: 'pending',
      amount: 18000,
      requester: '0x6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y',
      reason: 'AVAX/USD feed latency issue causing user losses',
      submittedAt: new Date(Date.now() - 86400000),
      votingDeadline: new Date(Date.now() + 86400000 * 2),
      votesFor: 890000,
      votesAgainst: 156000,
    },
  ];

  if (status && status !== 'all') {
    return allClaims.filter((claim) => claim.type === status);
  }
  return allClaims;
}
