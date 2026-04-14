import { createLogger } from '@/lib/utils/logger';

import { type Token } from './tokens';
import { type ContainerInterface, type ServiceFactory, type ServiceDescriptor } from './types';

const logger = createLogger('DIContainer');

export class Container implements ContainerInterface {
  private services: Map<string, ServiceDescriptor> = new Map();
  private static instance: Container | null = null;
  private resolutionStack: Set<string> = new Set();

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(token: Token<T>, factory: ServiceFactory<T>, singleton: boolean = true): void {
    const tokenId = token.id;

    if (this.services.has(tokenId)) {
      logger.warn(`Service "${tokenId}" is already registered. Overwriting.`);
    }

    this.services.set(tokenId, {
      factory,
      singleton,
    });

    logger.debug(`Service "${tokenId}" registered (singleton: ${singleton})`);
  }

  resolve<T>(token: Token<T>): T {
    const tokenId = token.id;

    if (this.resolutionStack.has(tokenId)) {
      const cyclePath = Array.from(this.resolutionStack).join(' -> ') + ' -> ' + tokenId;
      throw new Error(`Circular dependency detected: ${cyclePath}`);
    }

    const descriptor = this.services.get(tokenId);

    if (!descriptor) {
      throw new Error(`Service "${tokenId}" not found. Did you forget to register it?`);
    }

    if (descriptor.singleton) {
      if (descriptor.instance === undefined) {
        this.resolutionStack.add(tokenId);
        try {
          descriptor.instance = descriptor.factory() as T;
          logger.debug(`Service "${tokenId}" instantiated (singleton)`);
        } finally {
          this.resolutionStack.delete(tokenId);
        }
      }
      return descriptor.instance as T;
    }

    this.resolutionStack.add(tokenId);
    try {
      return descriptor.factory() as T;
    } finally {
      this.resolutionStack.delete(tokenId);
    }
  }

  has(token: Token<unknown>): boolean {
    return this.services.has(token.id);
  }

  clear(): void {
    this.services.clear();
    this.resolutionStack.clear();
    logger.debug('All services cleared');
  }

  unregister(token: Token<unknown>): boolean {
    const result = this.services.delete(token.id);
    if (result) {
      logger.debug(`Service "${token.id}" unregistered`);
    }
    return result;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys());
  }
}

export const container = Container.getInstance();
