import { createLogger } from '@/lib/utils/logger';

import type { IBCChannelInfo, IBCConnectionInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandIBC');

interface IBCChannelsResult {
  channels: Array<{
    state: string;
    ordering: string;
    counterparty: {
      port_id: string;
      channel_id: string;
    };
    connection_hops: string[];
    version: string;
    port_id: string;
    channel_id: string;
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

interface IBCConnectionsResult {
  connections: Array<{
    id: string;
    client_id: string;
    versions: Array<{
      identifier: string;
      features: string[];
    }>;
    state: string;
    counterparty: {
      client_id: string;
      connection_id: string;
      prefix: {
        key_prefix: string;
      };
    };
  }>;
  pagination: {
    next_key: string | null;
    total: string;
  };
}

export async function getIBCChannels(
  makeRestCall: RestCallFunction,
  limit: number = 100
): Promise<IBCChannelInfo[]> {
  try {
    const result = await makeRestCall<IBCChannelsResult>(
      `/ibc/core/channel/v1/channels?pagination.limit=${limit}`
    );

    return result.channels.map((ch) => ({
      channelId: ch.channel_id,
      portId: ch.port_id,
      state: ch.state,
      ordering: ch.ordering,
      counterpartyChannelId: ch.counterparty.channel_id,
      counterpartyPortId: ch.counterparty.port_id,
      connectionHops: ch.connection_hops,
      version: ch.version,
    }));
  } catch (error) {
    logger.error(
      'Failed to get IBC channels',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getIBCConnections(
  makeRestCall: RestCallFunction,
  limit: number = 100
): Promise<IBCConnectionInfo[]> {
  try {
    const result = await makeRestCall<IBCConnectionsResult>(
      `/ibc/core/connection/v1/connections?pagination.limit=${limit}`
    );

    return result.connections.map((conn) => ({
      connectionId: conn.id,
      clientId: conn.client_id,
      state: conn.state,
      counterpartyConnectionId: conn.counterparty.connection_id,
      counterpartyClientId: conn.counterparty.client_id,
      versions: conn.versions,
    }));
  } catch (error) {
    logger.error(
      'Failed to get IBC connections',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
