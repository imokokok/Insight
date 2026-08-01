import { type OracleFeedInsert } from '@/lib/supabase/queries';

export interface DiscoveryResult {
  provider: string;
  discovered: number;
  feeds: OracleFeedInsert[];
  errors: string[];
}
