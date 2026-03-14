import { container } from './Container';
import { SERVICE_TOKENS } from './tokens';
import { OracleClientFactory } from '@/lib/oracles/factory';
import { DatabaseQueries, createQueries } from '@/lib/supabase/queries';
import { supabase } from '@/lib/supabase/client';
import { IOracleClientFactory } from '@/lib/oracles/interfaces';
import { IAlertService, IFavoriteService, ISnapshotService } from './serviceInterfaces';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('registerServices');

class OracleClientFactoryAdapter implements IOracleClientFactory {
  getClient(provider: Parameters<IOracleClientFactory['getClient']>[0]) {
    return OracleClientFactory.getClient(provider);
  }

  getAllClients() {
    return OracleClientFactory.getAllClients();
  }

  hasClient(provider: Parameters<IOracleClientFactory['hasClient']>[0]) {
    return OracleClientFactory.hasClient(provider);
  }

  clearInstances() {
    OracleClientFactory.clearInstances();
  }
}

class AlertServiceImpl implements IAlertService {
  private queries: DatabaseQueries;

  constructor() {
    this.queries = createQueries(supabase);
  }

  getAlerts(userId: string) {
    return this.queries.getAlerts(userId);
  }

  createAlert(userId: string, alert: Parameters<IAlertService['createAlert']>[1]) {
    return this.queries.createAlert(userId, alert);
  }

  updateAlert(id: string, data: Parameters<IAlertService['updateAlert']>[1]) {
    return this.queries.updateAlert(id, data);
  }

  deleteAlert(id: string) {
    return this.queries.deleteAlert(id);
  }

  getAlertEvents(userId: string) {
    return this.queries.getAlertEvents(userId);
  }

  acknowledgeAlertEvent(eventId: string) {
    return this.queries.acknowledgeAlertEvent(eventId);
  }

  getActiveAlerts() {
    return this.queries.getActiveAlerts();
  }
}

class FavoriteServiceImpl implements IFavoriteService {
  private queries: DatabaseQueries;

  constructor() {
    this.queries = createQueries(supabase);
  }

  getFavorites(userId: string) {
    return this.queries.getFavorites(userId);
  }

  getFavoritesByType(
    userId: string,
    configType: Parameters<IFavoriteService['getFavoritesByType']>[1]
  ) {
    return this.queries.getFavoritesByType(userId, configType);
  }

  addFavorite(userId: string, favorite: Parameters<IFavoriteService['addFavorite']>[1]) {
    return this.queries.addFavorite(userId, favorite);
  }

  updateFavorite(id: string, data: Parameters<IFavoriteService['updateFavorite']>[1]) {
    return this.queries.updateFavorite(id, data);
  }

  deleteFavorite(id: string) {
    return this.queries.deleteFavorite(id);
  }
}

class SnapshotServiceImpl implements ISnapshotService {
  private queries: DatabaseQueries;

  constructor() {
    this.queries = createQueries(supabase);
  }

  getSnapshots(userId: string) {
    return this.queries.getSnapshots(userId);
  }

  getSnapshotById(id: string) {
    return this.queries.getSnapshotById(id);
  }

  getPublicSnapshot(id: string) {
    return this.queries.getPublicSnapshot(id);
  }

  saveSnapshot(userId: string, snapshot: Parameters<ISnapshotService['saveSnapshot']>[1]) {
    return this.queries.saveSnapshot(userId, snapshot);
  }

  updateSnapshot(id: string, data: Parameters<ISnapshotService['updateSnapshot']>[1]) {
    return this.queries.updateSnapshot(id, data);
  }

  deleteSnapshot(id: string) {
    return this.queries.deleteSnapshot(id);
  }
}

let isRegistered = false;

export function registerServices(): void {
  if (isRegistered) {
    logger.debug('Services already registered');
    return;
  }

  container.register<IOracleClientFactory>(
    SERVICE_TOKENS.ORACLE_CLIENT_FACTORY,
    () => new OracleClientFactoryAdapter(),
    true
  );

  container.register<IAlertService>(
    SERVICE_TOKENS.ALERT_SERVICE,
    () => new AlertServiceImpl(),
    true
  );

  container.register<IFavoriteService>(
    SERVICE_TOKENS.FAVORITE_SERVICE,
    () => new FavoriteServiceImpl(),
    true
  );

  container.register<ISnapshotService>(
    SERVICE_TOKENS.SNAPSHOT_SERVICE,
    () => new SnapshotServiceImpl(),
    true
  );

  isRegistered = true;
  logger.info('All services registered successfully');
}

export function clearServices(): void {
  container.clear();
  isRegistered = false;
  logger.debug('All services cleared');
}

export function isServicesRegistered(): boolean {
  return isRegistered;
}
