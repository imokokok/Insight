import { supabase } from '../supabase/client';
import { OracleSnapshot, SnapshotStats, OracleProvider, PriceData } from '@/types/oracle';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('snapshot-database');

export interface DatabaseSnapshot {
  id: string;
  user_id: string;
  symbol: string;
  selected_oracles: OracleProvider[];
  price_data: PriceData[];
  stats: SnapshotStats;
  name?: string;
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

function dbSnapshotToOracleSnapshot(db: DatabaseSnapshot): OracleSnapshot {
  return {
    id: db.id,
    timestamp: new Date(db.created_at).getTime(),
    symbol: db.symbol,
    selectedOracles: db.selected_oracles,
    priceData: db.price_data,
    stats: db.stats,
  };
}

export async function saveSnapshotToDatabase(
  userId: string,
  snapshot: Omit<OracleSnapshot, 'id' | 'timestamp'>
): Promise<OracleSnapshot | null> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .insert({
      user_id: userId,
      symbol: snapshot.symbol,
      selected_oracles: snapshot.selectedOracles,
      price_data: snapshot.priceData,
      stats: snapshot.stats,
      is_public: false,
    })
    .select()
    .single();

  if (error) {
    logger.error(
      'Failed to save snapshot to database',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }

  return dbSnapshotToOracleSnapshot(data as DatabaseSnapshot);
}

export async function getSnapshotsFromDatabase(userId: string): Promise<OracleSnapshot[]> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error(
      'Failed to get snapshots from database',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }

  return (data as DatabaseSnapshot[]).map(dbSnapshotToOracleSnapshot);
}

export async function getSnapshotById(id: string): Promise<OracleSnapshot | null> {
  const { data, error } = await supabase.from('user_snapshots').select('*').eq('id', id).single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error(
        'Failed to get snapshot by id',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    return null;
  }

  return dbSnapshotToOracleSnapshot(data as DatabaseSnapshot);
}

export async function getPublicSnapshot(id: string): Promise<OracleSnapshot | null> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      logger.error(
        'Failed to get public snapshot',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    return null;
  }

  return dbSnapshotToOracleSnapshot(data as DatabaseSnapshot);
}

export async function updateSnapshot(
  id: string,
  data: Partial<{
    name: string;
    symbol: string;
    selectedOracles: OracleProvider[];
    priceData: PriceData[];
    stats: SnapshotStats;
  }>
): Promise<OracleSnapshot | null> {
  const updateData: Record<string, unknown> = {
    ...data,
    updated_at: new Date().toISOString(),
  };

  if (data.selectedOracles) {
    updateData.selected_oracles = data.selectedOracles;
    delete updateData.selectedOracles;
  }
  if (data.priceData) {
    updateData.price_data = data.priceData;
    delete updateData.priceData;
  }

  const { data: updated, error } = await supabase
    .from('user_snapshots')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error(
      'Failed to update snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }

  return dbSnapshotToOracleSnapshot(updated as DatabaseSnapshot);
}

export async function deleteSnapshotFromDatabase(id: string): Promise<boolean> {
  const { error } = await supabase.from('user_snapshots').delete().eq('id', id);

  if (error) {
    logger.error(
      'Failed to delete snapshot from database',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }

  return true;
}

export async function shareSnapshot(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .update({ is_public: true, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error(
      'Failed to share snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }

  return data.id;
}

export async function unshareSnapshot(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_snapshots')
    .update({ is_public: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    logger.error(
      'Failed to unshare snapshot',
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }

  return true;
}

export async function getSnapshotShareStatus(id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_snapshots')
    .select('is_public')
    .eq('id', id)
    .single();

  if (error) {
    return false;
  }

  return data?.is_public ?? false;
}
