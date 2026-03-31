import { MOCK_DATA_STATUS } from '../api3MockDataAnnotations';

import type { AnnotatedData, OEVNetworkStats, OEVAuction, OEVParticipant } from './types';

export async function getOEVNetworkStats(): Promise<AnnotatedData<OEVNetworkStats>> {
  const participants: OEVParticipant[] = [
    {
      id: 'p1',
      name: 'FlashBots',
      type: 'searcher',
      totalVolume: 2850000,
      auctionsWon: 156,
      lastActive: new Date(Date.now() - 3600000),
    },
    {
      id: 'p2',
      name: 'Aave Protocol',
      type: 'dapp',
      totalVolume: 1920000,
      auctionsWon: 89,
      lastActive: new Date(Date.now() - 7200000),
    },
    {
      id: 'p3',
      name: 'MEV Protect',
      type: 'searcher',
      totalVolume: 1540000,
      auctionsWon: 72,
      lastActive: new Date(Date.now() - 1800000),
    },
    {
      id: 'p4',
      name: 'Compound Finance',
      type: 'dapp',
      totalVolume: 1280000,
      auctionsWon: 65,
      lastActive: new Date(Date.now() - 5400000),
    },
    {
      id: 'p5',
      name: 'Builder0x69',
      type: 'searcher',
      totalVolume: 980000,
      auctionsWon: 48,
      lastActive: new Date(Date.now() - 900000),
    },
    {
      id: 'p6',
      name: 'Uniswap V3',
      type: 'dapp',
      totalVolume: 875000,
      auctionsWon: 42,
      lastActive: new Date(Date.now() - 10800000),
    },
  ];

  const recentAuctions: OEVAuction[] = [];
  const dapps = ['Aave', 'Compound', 'Uniswap', 'SushiSwap', 'Curve'];
  const dapis = ['ETH/USD', 'BTC/USD', 'USDC/USD', 'DAI/USD', 'WBTC/USD'];
  const statuses: Array<'pending' | 'completed' | 'cancelled'> = [
    'completed',
    'completed',
    'completed',
    'pending',
    'cancelled',
  ];

  for (let i = 0; i < 10; i++) {
    recentAuctions.push({
      id: `auction-${i + 1}`,
      dappName: dapps[i % dapps.length],
      dapiName: dapis[i % dapis.length],
      auctionAmount: Math.floor(Math.random() * 50000) + 5000,
      winner: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      timestamp: new Date(Date.now() - i * 3600000 * 2),
      status: statuses[i % statuses.length],
      transactionHash:
        i % 3 !== 2
          ? `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
          : undefined,
    });
  }

  return {
    data: {
      totalOevCaptured: 12450000,
      activeAuctions: 12,
      totalParticipants: 89,
      totalDapps: 34,
      avgAuctionValue: 18500,
      last24hVolume: 892000,
      participantList: participants,
      recentAuctions,
    },
    annotation: MOCK_DATA_STATUS.oevNetworkStats,
  };
}

export async function getOEVAuctions(limit: number = 20): Promise<OEVAuction[]> {
  const auctions: OEVAuction[] = [];
  const dapps = ['Aave', 'Compound', 'Uniswap', 'SushiSwap', 'Curve', 'Balancer', 'Yearn'];
  const dapis = ['ETH/USD', 'BTC/USD', 'USDC/USD', 'DAI/USD', 'WBTC/USD', 'LINK/USD', 'MATIC/USD'];
  const statuses: Array<'pending' | 'completed' | 'cancelled'> = [
    'completed',
    'completed',
    'completed',
    'pending',
    'cancelled',
  ];

  for (let i = 0; i < limit; i++) {
    const status = statuses[i % statuses.length];
    auctions.push({
      id: `auction-${Date.now()}-${i}`,
      dappName: dapps[i % dapps.length],
      dapiName: dapis[i % dapis.length],
      auctionAmount: Math.floor(Math.random() * 80000) + 2000,
      winner: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      timestamp: new Date(Date.now() - i * 1800000),
      status,
      transactionHash:
        status !== 'pending'
          ? `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`
          : undefined,
    });
  }

  return auctions;
}
