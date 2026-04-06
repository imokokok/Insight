import { createLogger } from '@/lib/utils/logger';

import type { BlockInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandBlocks');

interface BlockResult {
  block: {
    header: {
      height: string;
      time: string;
      chain_id: string;
      proposer_address: string;
    };
    data: {
      txs: string[];
    };
    last_commit: {
      signatures: Array<{
        validator_address: string;
        timestamp: string;
        signature: string;
      }>;
    };
  };
}

export async function getLatestBlockHeight(makeRestCall: RestCallFunction): Promise<number> {
  try {
    const result = await makeRestCall<{ block: { header: { height: string } } }>(
      '/cosmos/base/tendermint/v1beta1/blocks/latest'
    );
    return parseInt(result.block.header.height, 10);
  } catch (error) {
    logger.error(
      'Failed to get latest block height',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getBlock(
  makeRestCall: RestCallFunction,
  height?: number
): Promise<BlockResult> {
  const endpoint = height
    ? `/cosmos/base/tendermint/v1beta1/blocks/${height}`
    : '/cosmos/base/tendermint/v1beta1/blocks/latest';
  return makeRestCall<BlockResult>(endpoint);
}

export async function getBlockInfo(
  makeRestCall: RestCallFunction,
  height?: number
): Promise<BlockInfo> {
  try {
    const block = await getBlock(makeRestCall, height);
    return {
      height: parseInt(block.block.header.height, 10),
      hash: '',
      time: block.block.header.time,
      proposerAddress: block.block.header.proposer_address,
      txCount: block.block.data.txs.length,
      chainId: block.block.header.chain_id,
    };
  } catch (error) {
    logger.error(
      'Failed to get block info',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}

export async function getBlocks(
  makeRestCall: RestCallFunction,
  minHeight: number,
  maxHeight: number
): Promise<BlockInfo[]> {
  try {
    const blockInfos: BlockInfo[] = [];
    const promises: Promise<void>[] = [];

    const limit = Math.min(maxHeight - minHeight + 1, 20);
    const startHeight = maxHeight - limit + 1;

    for (let height = startHeight; height <= maxHeight; height++) {
      promises.push(
        makeRestCall<{
          block: {
            header: {
              height: string;
              time: string;
              proposer_address: string;
              chain_id: string;
            };
            data: { txs: string[] };
          };
        }>(`/cosmos/base/tendermint/v1beta1/blocks/${height}`)
          .then((result) => {
            blockInfos.push({
              height: parseInt(result.block.header.height, 10),
              hash: '',
              time: result.block.header.time,
              proposerAddress: result.block.header.proposer_address,
              txCount: result.block.data.txs.length,
              chainId: result.block.header.chain_id,
            });
          })
          .catch(() => {})
      );
    }

    await Promise.all(promises);

    return blockInfos.sort((a, b) => b.height - a.height);
  } catch (error) {
    logger.error('Failed to get blocks', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

export async function getLatestBlocks(
  makeRestCall: RestCallFunction,
  limit: number = 10
): Promise<BlockInfo[]> {
  try {
    const latestHeight = await getLatestBlockHeight(makeRestCall);
    const minHeight = Math.max(1, latestHeight - limit + 1);
    return getBlocks(makeRestCall, minHeight, latestHeight);
  } catch (error) {
    logger.error(
      'Failed to get latest blocks',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
