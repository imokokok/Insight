import { type Blockchain } from '@/types/oracle';

export interface PriceDifferenceItem {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
}
