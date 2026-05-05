import { type Blockchain, BLOCKCHAIN_VALUES } from '@/types/oracle';

export function isBlockchain(value: unknown): value is Blockchain {
  return typeof value === 'string' && (BLOCKCHAIN_VALUES as readonly string[]).includes(value);
}
