import { type IOracleClientFactory } from '@/lib/oracles/interfaces';

import {
  type IAlertService,
  type IFavoriteService,
  type ISnapshotService,
} from './serviceInterfaces';

export class Token<T> {
  readonly id: string;

  private _brand!: T;

  constructor(id: string) {
    this.id = id;
  }

  toString(): string {
    return this.id;
  }

  equals(other: Token<unknown>): boolean {
    return this.id === other.id;
  }
}

export const ORACLE_CLIENT_FACTORY_TOKEN = new Token<IOracleClientFactory>('IOracleClientFactory');
export const ALERT_SERVICE_TOKEN = new Token<IAlertService>('IAlertService');
export const FAVORITE_SERVICE_TOKEN = new Token<IFavoriteService>('IFavoriteService');
export const SNAPSHOT_SERVICE_TOKEN = new Token<ISnapshotService>('ISnapshotService');

export const SERVICE_TOKENS = {
  ORACLE_CLIENT_FACTORY: ORACLE_CLIENT_FACTORY_TOKEN,
  ALERT_SERVICE: ALERT_SERVICE_TOKEN,
  FAVORITE_SERVICE: FAVORITE_SERVICE_TOKEN,
  SNAPSHOT_SERVICE: SNAPSHOT_SERVICE_TOKEN,
} as const;

export type ServiceToken = (typeof SERVICE_TOKENS)[keyof typeof SERVICE_TOKENS];
