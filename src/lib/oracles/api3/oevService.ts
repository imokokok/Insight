import type { AnnotatedData, OEVNetworkStats, OEVAuction, OEVParticipant } from './types';

/**
 * Retrieves OEV (Oracle Extractable Value) network statistics
 * @returns Annotated OEV network statistics including participants and recent auctions
 */
export async function getOEVNetworkStats(): Promise<AnnotatedData<OEVNetworkStats>> {
  // 返回空数据，表示暂无数据
  return {
    data: {
      totalOevCaptured: 0,
      activeAuctions: 0,
      totalParticipants: 0,
      totalDapps: 0,
      avgAuctionValue: 0,
      last24hVolume: 0,
      participantList: [],
      recentAuctions: [],
    },
    annotation: {
      isMock: false,
      source: 'api',
      confidence: 0,
    },
  };
}

/**
 * Retrieves OEV auction history
 * @param limit - Maximum number of auctions to retrieve (default: 20)
 * @returns Array of OEV auctions
 */
export async function getOEVAuctions(limit: number = 20): Promise<OEVAuction[]> {
  // 返回空数组，表示暂无数据
  return [];
}
