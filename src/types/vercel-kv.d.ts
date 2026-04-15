declare module '@vercel/kv' {
  interface KvCommands {
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<boolean>;
    ttl(key: string): Promise<number>;
    get<T = unknown>(key: string): Promise<T | null>;
  }

  export const kv: KvCommands;
}
