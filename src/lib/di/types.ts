import { type Token } from './tokens';

export type ServiceFactory<T = unknown> = () => T;

export interface ServiceDescriptor<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export interface ContainerInterface {
  register<T>(token: Token<T>, factory: ServiceFactory<T>, singleton?: boolean): void;
  resolve<T>(token: Token<T>): T;
  has(token: Token<unknown>): boolean;
  clear(): void;
}
