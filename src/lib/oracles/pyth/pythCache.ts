import { TTLCache } from '@/lib/utils/cache';

export class PythCache {
  private impl: TTLCache;

  constructor() {
    this.impl = new TTLCache({ maxSize: 500, cleanupIntervalMs: 0 });
  }

  get<T>(key: string): T | null {
    return this.impl.get<T>(key);
  }

  set<T>(key: string, data: T, ttl: number): void {
    this.impl.set(key, data, ttl);
  }

  clear(): void {
    this.impl.clear();
  }

  has(key: string): boolean {
    return this.impl.has(key);
  }

  size(): number {
    return this.impl.size;
  }

  delete(key: string): boolean {
    return this.impl.delete(key);
  }
}
