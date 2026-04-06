import { createLogger } from '@/lib/utils/logger';

import type { TransactionInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandTransactions');

interface TxResult {
  tx: {
    body: {
      messages: Array<{
        '@type': string;
        [key: string]: unknown;
      }>;
      memo: string;
    };
    auth_info: {
      fee: {
        amount: Array<{
          denom: string;
          amount: string;
        }>;
        gas_limit: string;
      };
    };
  };
  tx_response: {
    height: string;
    txhash: string;
    codespace: string;
    code: number;
    data: string;
    raw_log: string;
    logs: Array<{
      msg_index: number;
      log: string;
      events: Array<{
        type: string;
        attributes: Array<{
          key: string;
          value: string;
        }>;
      }>;
    }>;
    info: string;
    gas_wanted: string;
    gas_used: string;
    tx: string;
    timestamp: string;
  };
}

export async function getTransaction(
  makeRestCall: RestCallFunction,
  hash: string
): Promise<TransactionInfo> {
  try {
    const result = await makeRestCall<TxResult>(`/cosmos/tx/v1beta1/txs/${hash}`);

    return {
      hash: result.tx_response.txhash,
      height: parseInt(result.tx_response.height, 10),
      timestamp: result.tx_response.timestamp,
      gasUsed: parseInt(result.tx_response.gas_used, 10),
      gasWanted: parseInt(result.tx_response.gas_wanted, 10),
      code: result.tx_response.code,
      memo: result.tx.body.memo,
      messages: result.tx.body.messages.map((msg) => ({
        type: msg['@type'],
        ...msg,
      })),
    };
  } catch (error) {
    logger.error(
      'Failed to get transaction',
      error instanceof Error ? error : new Error(String(error)),
      { hash }
    );
    throw error;
  }
}

export async function searchTransactions(
  makeRestCall: RestCallFunction,
  query: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ transactions: TransactionInfo[]; total: number }> {
  try {
    const heightMatch = query.match(/tx\.height>(\d+)/);
    const minHeight = heightMatch ? parseInt(heightMatch[1], 10) : undefined;

    let endpoint = `/cosmos/tx/v1beta1/txs?pagination.limit=${perPage}&pagination.offset=${(page - 1) * perPage}`;
    if (minHeight !== undefined) {
      endpoint += `&events=tx.height>${minHeight}`;
    }

    const result = await makeRestCall<{
      txs: Array<{
        body: {
          messages: Array<{
            '@type': string;
            [key: string]: unknown;
          }>;
          memo: string;
        };
      }>;
      tx_responses: Array<{
        height: string;
        txhash: string;
        code: number;
        raw_log: string;
        gas_wanted: string;
        gas_used: string;
        timestamp: string;
      }>;
      pagination: {
        total: string;
      };
    }>(endpoint);

    const transactions = result.txs.map((tx, index) => ({
      hash: result.tx_responses[index]?.txhash || '',
      height: parseInt(result.tx_responses[index]?.height || '0', 10),
      timestamp: result.tx_responses[index]?.timestamp || '',
      gasUsed: parseInt(result.tx_responses[index]?.gas_used || '0', 10),
      gasWanted: parseInt(result.tx_responses[index]?.gas_wanted || '0', 10),
      code: result.tx_responses[index]?.code || 0,
      memo: tx.body.memo,
      messages: tx.body.messages.map((msg) => ({
        type: msg['@type'],
        ...msg,
      })),
    }));

    return {
      transactions,
      total: parseInt(result.pagination.total, 10),
    };
  } catch (error) {
    logger.error(
      'Failed to search transactions',
      error instanceof Error ? error : new Error(String(error)),
      { query }
    );
    throw error;
  }
}
