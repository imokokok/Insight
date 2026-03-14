import {
  PriceAlert,
  PriceAlertInsert,
  AlertEvent,
  UserFavorite,
  UserFavoriteInsert,
  UserSnapshot,
  UserSnapshotInsert,
} from '@/lib/supabase/queries';

export interface IAlertService {
  getAlerts(userId: string): Promise<PriceAlert[] | null>;
  createAlert(userId: string, alert: Omit<PriceAlertInsert, 'user_id'>): Promise<PriceAlert | null>;
  updateAlert(id: string, data: Partial<PriceAlertInsert>): Promise<PriceAlert | null>;
  deleteAlert(id: string): Promise<boolean>;
  getAlertEvents(userId: string): Promise<AlertEvent[] | null>;
  acknowledgeAlertEvent(eventId: string): Promise<AlertEvent | null>;
  getActiveAlerts(): Promise<PriceAlert[] | null>;
}

export interface IFavoriteService {
  getFavorites(userId: string): Promise<UserFavorite[] | null>;
  getFavoritesByType(
    userId: string,
    configType: 'oracle_config' | 'symbol' | 'chain_config'
  ): Promise<UserFavorite[] | null>;
  addFavorite(
    userId: string,
    favorite: Omit<UserFavoriteInsert, 'user_id'>
  ): Promise<UserFavorite | null>;
  updateFavorite(id: string, data: Partial<UserFavoriteInsert>): Promise<UserFavorite | null>;
  deleteFavorite(id: string): Promise<boolean>;
}

export interface ISnapshotService {
  getSnapshots(userId: string): Promise<UserSnapshot[] | null>;
  getSnapshotById(id: string): Promise<UserSnapshot | null>;
  getPublicSnapshot(id: string): Promise<UserSnapshot | null>;
  saveSnapshot(
    userId: string,
    snapshot: Omit<UserSnapshotInsert, 'user_id'>
  ): Promise<UserSnapshot | null>;
  updateSnapshot(id: string, data: Partial<UserSnapshotInsert>): Promise<UserSnapshot | null>;
  deleteSnapshot(id: string): Promise<boolean>;
}
