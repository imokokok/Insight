export const SERVICE_TOKENS = {
  ORACLE_CLIENT_FACTORY: 'IOracleClientFactory',
  ALERT_SERVICE: 'IAlertService',
  FAVORITE_SERVICE: 'IFavoriteService',
  SNAPSHOT_SERVICE: 'ISnapshotService',
} as const;

export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
