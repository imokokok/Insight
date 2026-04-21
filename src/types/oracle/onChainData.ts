import type { ReflectorTokenOnChainData } from '@/hooks/oracles/useReflectorOnChainData';
import type { TwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';
import type { FlareTokenOnChainData } from '@/lib/oracles/clients/flare';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

export type AnyOnChainData =
  | DIATokenOnChainData
  | RedStoneTokenOnChainData
  | SupraTokenOnChainData
  | WINkLinkTokenOnChainData
  | TwapOnChainData
  | ReflectorTokenOnChainData
  | FlareTokenOnChainData;

export interface OnChainData {
  diaOnChainData?: AnyOnChainData | null;
  isDIADataLoading?: boolean;
  winklinkOnChainData?: AnyOnChainData | null;
  isWINkLinkDataLoading?: boolean;
  redstoneOnChainData?: AnyOnChainData | null;
  isRedStoneDataLoading?: boolean;
  supraOnChainData?: AnyOnChainData | null;
  isSupraDataLoading?: boolean;
  twapOnChainData?: AnyOnChainData | null;
  isTwapDataLoading?: boolean;
  reflectorOnChainData?: AnyOnChainData | null;
  isReflectorDataLoading?: boolean;
  flareOnChainData?: AnyOnChainData | null;
  isFlareDataLoading?: boolean;
}
