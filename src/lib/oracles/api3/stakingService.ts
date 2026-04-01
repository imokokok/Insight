import type { StakerReward } from './types';

/**
 * Retrieves staker rewards data
 * @param address - Optional staker address to filter results
 * @returns Array of staker reward information
 */
export async function getStakerRewards(address?: string): Promise<StakerReward[]> {
  const allStakers: StakerReward[] = [
    {
      stakerAddress: '0x1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T',
      stakedAmount: 15000,
      pendingRewards: 156.25,
      claimedRewards: 2340.5,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 180),
      lockEndDate: new Date(Date.now() + 86400000 * 30),
    },
    {
      stakerAddress: '0x2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U',
      stakedAmount: 8500,
      pendingRewards: 88.54,
      claimedRewards: 1325.8,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 150),
    },
    {
      stakerAddress: '0x3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
      stakedAmount: 25000,
      pendingRewards: 260.42,
      claimedRewards: 3900.75,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 200),
      lockEndDate: new Date(Date.now() + 86400000 * 60),
    },
    {
      stakerAddress: '0x4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W',
      stakedAmount: 5200,
      pendingRewards: 54.17,
      claimedRewards: 811.25,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 120),
    },
    {
      stakerAddress: '0x5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X',
      stakedAmount: 12000,
      pendingRewards: 125.0,
      claimedRewards: 1872.4,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 160),
    },
    {
      stakerAddress: '0x6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y',
      stakedAmount: 3200,
      pendingRewards: 33.33,
      claimedRewards: 499.5,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 90),
    },
    {
      stakerAddress: '0x7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X5y6Z',
      stakedAmount: 45000,
      pendingRewards: 468.75,
      claimedRewards: 7021.5,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 220),
      lockEndDate: new Date(Date.now() + 86400000 * 45),
    },
    {
      stakerAddress: '0x8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y6z7A',
      stakedAmount: 6800,
      pendingRewards: 70.83,
      claimedRewards: 1061.25,
      apr: 12.5,
      stakeDate: new Date(Date.now() - 86400000 * 100),
    },
  ];

  if (address) {
    return allStakers.filter(
      (staker) => staker.stakerAddress.toLowerCase() === address.toLowerCase()
    );
  }
  return allStakers;
}
