export type ServiceFactory<T = unknown> = () => T;

export interface ServiceDescriptor<T = unknown> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

export interface ContainerInterface {
  register<T>(token: string, factory: ServiceFactory<T>, singleton?: boolean): void;
  resolve<T>(token: string): T;
  has(token: string): boolean;
  clear(): void;
}
