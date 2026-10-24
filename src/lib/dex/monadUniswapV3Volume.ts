import { decodeEventLog, getEventSelector, parseAbiItem } from 'viem';
import { z } from 'zod';

import {
  MONAD_CHAIN_ID,
  MONAD_UNISWAP_V3_WMON_USDC,
  MonadDexRpcClient,
  type MonadDexRawLog,
} from '@/lib/dex/monadUniswapV3';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { mapWithConcurrency } from '@/lib/utils/concurrency';

const DEX = 'uniswap-v3';
const FINALITY_BLOCKS = 32n;
const INITIAL_BACKFILL_BLOCKS = 1_200n;
const MAX_BLOCKS_PER_RUN = 5_000n;
const LOG_BLOCK_RANGE = 100n;
const LOG_CONCURRENCY = 4;
const BLOCK_CONCURRENCY = 6;
const QUOTE_DECIMALS = 6;
const FRESH_INDEX_LAG_SECONDS = 10 * 60;

const SWAP_EVENT = parseAbiItem(
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)'
);
const SWAP_TOPIC = getEventSelector(SWAP_EVENT);

const cursorSchema = z.object({
  last_scanned_block: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
  last_scanned_timestamp: z.string().datetime({ offset: true }),
  coverage_started_at: z.string().datetime({ offset: true }),
});

const summarySchema = z.object({
  swap_count: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]),
  gross_quote_volume_raw: z.union([z.number().nonnegative(), z.string().regex(/^\d+$/)]),
});

interface DexCursor {
  lastScannedBlock: bigint;
  lastScannedTimestamp: string;
  coverageStartedAt: string;
}

export interface MonadDexVolumeWindow {
  windowSeconds: number;
  swapCount: number | null;
  grossUsdcVolume: number | null;
}

export interface MonadDexVolumeSummary {
  status: 'ready' | 'warming' | 'unavailable';
  asOf: string | null;
  indexLagSeconds: number | null;
  coverageStartedAt: string | null;
  windows: {
    fiveMinutes: MonadDexVolumeWindow;
    twentyFourHours: MonadDexVolumeWindow;
  };
}

export interface MonadDexVolumeSyncResult {
  fromBlock: string;
  toBlock: string;
  indexedSwapCount: number;
  headBlock: string;
  caughtUp: boolean;
}

function toBigInt(value: number | string, field: string): bigint {
  try {
    const stringValue = String(value);
    if (!/^\d+$/.test(stringValue)) throw new Error('not a non-negative integer');
    return BigInt(stringValue);
  } catch {
    throw new Error(`Invalid persisted Monad DEX ${field}.`);
  }
}

function toTimestamp(value: string, field: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(`Invalid persisted Monad DEX ${field}.`);
  return timestamp;
}

function rawUsdcToNumber(raw: bigint): number | null {
  const value = Number(raw) / 10 ** QUOTE_DECIMALS;
  return Number.isFinite(value) && value >= 0 ? value : null;
}

async function loadCursor(): Promise<DexCursor | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('dex_market_sync_cursors')
    .select('last_scanned_block,last_scanned_timestamp,coverage_started_at')
    .eq('chain_id', MONAD_CHAIN_ID)
    .eq('dex', DEX)
    .eq('pool_address', MONAD_UNISWAP_V3_WMON_USDC.pool.toLowerCase())
    .maybeSingle();
  if (error) throw new Error('Monad DEX cursor read failed.');
  if (data === null) return null;
  const parsed = cursorSchema.safeParse(data);
  if (!parsed.success) throw new Error('Monad DEX cursor validation failed.');
  return {
    lastScannedBlock: toBigInt(parsed.data.last_scanned_block, 'cursor block'),
    lastScannedTimestamp: parsed.data.last_scanned_timestamp,
    coverageStartedAt: parsed.data.coverage_started_at,
  };
}

function blockRanges(
  fromBlock: bigint,
  toBlock: bigint
): Array<{ fromBlock: bigint; toBlock: bigint }> {
  const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_BLOCK_RANGE) {
    ranges.push({
      fromBlock: start,
      toBlock: start + LOG_BLOCK_RANGE - 1n <= toBlock ? start + LOG_BLOCK_RANGE - 1n : toBlock,
    });
  }
  return ranges;
}

function decodeSwap(log: MonadDexRawLog): {
  transactionHash: string;
  logIndex: string;
  blockNumber: bigint;
  blockHash: string;
  amount0Raw: string;
  amount1Raw: string;
} {
  if (log.address.toLowerCase() !== MONAD_UNISWAP_V3_WMON_USDC.pool.toLowerCase()) {
    throw new Error('Monad DEX log has an unexpected pool address.');
  }
  if (log.topics.length === 0) throw new Error('Monad DEX Swap event has no topics.');
  const decoded = decodeEventLog({
    abi: [SWAP_EVENT],
    eventName: 'Swap',
    data: log.data,
    topics: [log.topics[0], ...log.topics.slice(1)],
  });
  const amount0 = decoded.args.amount0;
  const amount1 = decoded.args.amount1;
  if (typeof amount0 !== 'bigint' || typeof amount1 !== 'bigint') {
    throw new Error('Monad DEX Swap event is malformed.');
  }
  return {
    transactionHash: log.transactionHash.toLowerCase(),
    logIndex: log.logIndex.toString(),
    blockNumber: log.blockNumber,
    blockHash: log.blockHash.toLowerCase(),
    amount0Raw: amount0.toString(),
    amount1Raw: amount1.toString(),
  };
}

/**
 * Index finalized Uniswap V3 Swap events. The cursor advances only after all
 * logs and blocks are validated and persisted, so a failure remains retryable
 * without manufacturing a gap in the rolling-volume history.
 */
export async function syncMonadUniswapV3Volume(
  options: {
    rpc?: MonadDexRpcClient;
    signal?: AbortSignal;
  } = {}
): Promise<MonadDexVolumeSyncResult> {
  const rpc = options.rpc ?? new MonadDexRpcClient();
  const head = await rpc.getBlockNumber(options.signal);
  if (head <= FINALITY_BLOCKS)
    throw new Error('Monad head is too low to index finalized DEX events.');
  const finalizedHead = head - FINALITY_BLOCKS;
  const cursor = await loadCursor();
  const initialFrom =
    finalizedHead > INITIAL_BACKFILL_BLOCKS ? finalizedHead - INITIAL_BACKFILL_BLOCKS + 1n : 0n;
  const fromBlock = cursor ? cursor.lastScannedBlock + 1n : initialFrom;

  if (fromBlock > finalizedHead) {
    return {
      fromBlock: fromBlock.toString(),
      toBlock: finalizedHead.toString(),
      indexedSwapCount: 0,
      headBlock: head.toString(),
      caughtUp: true,
    };
  }

  const toBlock =
    fromBlock + MAX_BLOCKS_PER_RUN - 1n < finalizedHead
      ? fromBlock + MAX_BLOCKS_PER_RUN - 1n
      : finalizedHead;
  const ranges = blockRanges(fromBlock, toBlock);
  const batches = await mapWithConcurrency(ranges, LOG_CONCURRENCY, (range) =>
    rpc.getLogs(
      {
        address: MONAD_UNISWAP_V3_WMON_USDC.pool,
        topic0: SWAP_TOPIC,
        ...range,
      },
      options.signal
    )
  );
  const swaps = batches.flat().map(decodeSwap);
  const blockNumbers = [...new Set(swaps.map((swap) => swap.blockNumber.toString()))].map(BigInt);
  const blockTimes = new Map(
    (
      await mapWithConcurrency(blockNumbers, BLOCK_CONCURRENCY, async (blockNumber) => {
        const block = await rpc.getBlock(blockNumber, options.signal);
        return [blockNumber.toString(), new Date(block.timestamp * 1000).toISOString()] as const;
      })
    ).map(([blockNumber, timestamp]) => [blockNumber, timestamp])
  );
  const [fromBlockData, toBlockData] = await Promise.all([
    rpc.getBlock(fromBlock, options.signal),
    rpc.getBlock(toBlock, options.signal),
  ]);

  const supabase = createServiceRoleClient();
  if (swaps.length > 0) {
    const rows = swaps.map((swap) => {
      const blockTimestamp = blockTimes.get(swap.blockNumber.toString());
      if (!blockTimestamp) throw new Error('Monad DEX Swap event has no block timestamp.');
      return {
        chain_id: MONAD_CHAIN_ID,
        dex: DEX,
        pool_address: MONAD_UNISWAP_V3_WMON_USDC.pool.toLowerCase(),
        tx_hash: swap.transactionHash,
        log_index: swap.logIndex,
        block_number: swap.blockNumber.toString(),
        block_hash: swap.blockHash,
        block_timestamp: blockTimestamp,
        amount0_raw: swap.amount0Raw,
        amount1_raw: swap.amount1Raw,
      };
    });
    const { error } = await supabase
      .from('dex_market_swap_events')
      .upsert(rows, { onConflict: 'chain_id,dex,pool_address,tx_hash,log_index' });
    if (error) throw new Error('Monad DEX Swap event upsert failed.');
  }

  const coverageStartedAt =
    cursor?.coverageStartedAt ?? new Date(fromBlockData.timestamp * 1000).toISOString();
  const { error: cursorError } = await supabase.from('dex_market_sync_cursors').upsert(
    {
      chain_id: MONAD_CHAIN_ID,
      dex: DEX,
      pool_address: MONAD_UNISWAP_V3_WMON_USDC.pool.toLowerCase(),
      last_scanned_block: toBlock.toString(),
      last_scanned_timestamp: new Date(toBlockData.timestamp * 1000).toISOString(),
      coverage_started_at: coverageStartedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'chain_id,dex,pool_address' }
  );
  if (cursorError) throw new Error('Monad DEX cursor upsert failed.');

  return {
    fromBlock: fromBlock.toString(),
    toBlock: toBlock.toString(),
    indexedSwapCount: swaps.length,
    headBlock: head.toString(),
    caughtUp: toBlock === finalizedHead,
  };
}

async function loadWindow(asOf: string, windowSeconds: number): Promise<MonadDexVolumeWindow> {
  const endMs = toTimestamp(asOf, 'index timestamp');
  const start = new Date(endMs - windowSeconds * 1000).toISOString();
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .rpc('get_dex_market_volume_window', {
      p_chain_id: MONAD_CHAIN_ID,
      p_dex: DEX,
      p_pool_address: MONAD_UNISWAP_V3_WMON_USDC.pool.toLowerCase(),
      p_window_start: start,
      p_window_end: asOf,
    })
    .abortSignal(AbortSignal.timeout(10_000));
  if (error) throw new Error('Monad DEX volume rollup read failed.');
  const parsed = summarySchema.safeParse(Array.isArray(data) ? data[0] : null);
  if (!parsed.success) throw new Error('Monad DEX volume rollup validation failed.');
  const raw = toBigInt(parsed.data.gross_quote_volume_raw, 'volume');
  return {
    windowSeconds,
    swapCount: Number(toBigInt(parsed.data.swap_count, 'swap count')),
    grossUsdcVolume: rawUsdcToNumber(raw),
  };
}

/**
 * Return source-local rolling volume only when the contiguous index coverage
 * is sufficient. A lack of 24h history is explicit "warming", never zero.
 */
export async function getMonadUniswapV3VolumeSummary(
  sourceBlockTimestamp: string
): Promise<MonadDexVolumeSummary> {
  const empty = {
    fiveMinutes: { windowSeconds: 300, swapCount: null, grossUsdcVolume: null },
    twentyFourHours: { windowSeconds: 86_400, swapCount: null, grossUsdcVolume: null },
  } as const;
  try {
    const cursor = await loadCursor();
    if (!cursor) {
      return {
        status: 'warming',
        asOf: null,
        indexLagSeconds: null,
        coverageStartedAt: null,
        windows: empty,
      };
    }
    const asOfMs = toTimestamp(cursor.lastScannedTimestamp, 'last scanned timestamp');
    const sourceMs = toTimestamp(sourceBlockTimestamp, 'source block timestamp');
    const coverageMs = asOfMs - toTimestamp(cursor.coverageStartedAt, 'coverage start');
    const indexLagSeconds = Math.max(0, (sourceMs - asOfMs) / 1000);
    const fiveMinuteCovered = coverageMs >= 300_000 && indexLagSeconds <= FRESH_INDEX_LAG_SECONDS;
    const dayCovered = coverageMs >= 86_400_000 && indexLagSeconds <= FRESH_INDEX_LAG_SECONDS;
    const [fiveMinutes, twentyFourHours] = await Promise.all([
      fiveMinuteCovered
        ? loadWindow(cursor.lastScannedTimestamp, 300)
        : Promise.resolve(empty.fiveMinutes),
      dayCovered
        ? loadWindow(cursor.lastScannedTimestamp, 86_400)
        : Promise.resolve(empty.twentyFourHours),
    ]);
    return {
      status: dayCovered ? 'ready' : 'warming',
      asOf: cursor.lastScannedTimestamp,
      indexLagSeconds,
      coverageStartedAt: cursor.coverageStartedAt,
      windows: { fiveMinutes, twentyFourHours },
    };
  } catch {
    // The live quote remains useful even while a migration, cron, or database
    // read is unavailable. Do not manufacture a zero-volume observation.
    return {
      status: 'unavailable',
      asOf: null,
      indexLagSeconds: null,
      coverageStartedAt: null,
      windows: empty,
    };
  }
}
