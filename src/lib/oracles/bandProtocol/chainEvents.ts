import { createLogger } from '@/lib/utils/logger';

import { searchTransactions } from './transactions';
import { EventType } from './types';

import type { ChainEvent, TransactionInfo } from './types';
import type { RestCallFunction } from './validators';

const logger = createLogger('BandChainEvents');

export async function getChainEvents(
  makeRestCall: RestCallFunction,
  eventType: EventType,
  limit: number = 100
): Promise<ChainEvent[]> {
  try {
    const messageTypeMap: Record<EventType, string> = {
      [EventType.DELEGATION]: '/cosmos.staking.v1beta1.MsgDelegate',
      [EventType.UNDELEGATION]: '/cosmos.staking.v1beta1.MsgUndelegate',
      [EventType.COMMISSION_CHANGE]: '/cosmos.staking.v1beta1.MsgEditValidator',
      [EventType.JAILED]: '/cosmos.slashing.v1beta1.MsgUnjail',
      [EventType.UNJAILED]: '/cosmos.slashing.v1beta1.MsgUnjail',
    };

    const messageType = messageTypeMap[eventType];
    const query = `message.action='${messageType}'`;

    const { transactions } = await searchTransactions(makeRestCall, query, 1, limit);

    return transactions.map((tx, index) => {
      const message = tx.messages[0] as Record<string, unknown> | undefined;
      const amountValue = message?.amount;
      const amount =
        Array.isArray(amountValue) && amountValue[0] && typeof amountValue[0] === 'object'
          ? parseFloat((amountValue[0] as Record<string, unknown>).amount as string) / 1e6
          : 0;

      return {
        id: `${tx.hash}-${index}`,
        type: eventType,
        validator: String(message?.validator_address || message?.validator_addr || 'Unknown'),
        validatorAddress: String(message?.validator_address || message?.validator_addr || ''),
        amount,
        timestamp: new Date(tx.timestamp).getTime(),
        description: getEventDescription(eventType, message),
        txHash: tx.hash,
      };
    });
  } catch (error) {
    logger.error(
      'Failed to get chain events',
      error instanceof Error ? error : new Error(String(error)),
      { eventType }
    );
    throw error;
  }
}

function getEventDescription(eventType: EventType, message: unknown): string {
  const msg = message as Record<string, unknown>;
  switch (eventType) {
    case EventType.DELEGATION:
      return `委托给验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'}`;
    case EventType.UNDELEGATION:
      return `从验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 解除委托`;
    case EventType.COMMISSION_CHANGE:
      return `验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 变更佣金率`;
    case EventType.JAILED:
      return `验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 被监禁`;
    case EventType.UNJAILED:
      return `验证人 ${msg?.validator_address || msg?.validator_addr || 'Unknown'} 被释放`;
    default:
      return '未知事件';
  }
}
