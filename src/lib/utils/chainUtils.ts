import { type Blockchain, BLOCKCHAIN_VALUES } from '@/types/oracle';

export function isBlockchain(value: unknown): value is Blockchain {
  return typeof value === 'string' && BLOCKCHAIN_VALUES.some((v) => v === value);
}
