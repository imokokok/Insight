import { ContainerInterface, ServiceFactory, ServiceDescriptor } from './types';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('DIContainer');

export class Container implements ContainerInterface {
  private services: Map<string, ServiceDescriptor> = new Map();
  private static instance: Container | null = null;

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  register<T>(token: string, factory: ServiceFactory<T>, singleton: boolean = true): void {
    if (this.services.has(token)) {
      logger.warn(`Service "${token}" is already registered. Overwriting.`);
    }

    this.services.set(token, {
      factory,
      singleton,
    });

    logger.debug(`Service "${token}" registered (singleton: ${singleton})`);
  }

  resolve<T>(token: string): T {
    const descriptor = this.services.get(token);

    if (!descriptor) {
      throw new Error(`Service "${token}" not found. Did you forget to register it?`);
    }

    if (descriptor.singleton) {
      if (descriptor.instance === undefined) {
        descriptor.instance = descriptor.factory() as T;
        logger.debug(`Service "${token}" instantiated (singleton)`);
      }
      return descriptor.instance as T;
    }

    return descriptor.factory() as T;
  }

  has(token: string): boolean {
    return this.services.has(token);
  }

  clear(): void {
    this.services.clear();
    logger.debug('All services cleared');
  }

  unregister(token: string): boolean {
    const result = this.services.delete(token);
    if (result) {
      logger.debug(`Service "${token}" unregistered`);
    }
    return result;
  }

  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys());
  }
}

export const container = Container.getInstance();
