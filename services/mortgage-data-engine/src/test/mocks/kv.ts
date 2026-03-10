/**
 * In-memory KVNamespace mock.
 */
export class MockKVNamespace {
  private store = new Map<string, { value: string; expiration?: number; metadata?: unknown }>();

  async get(
    key: string,
    options?: { type?: string }
  ): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiration && entry.expiration < Date.now() / 1000) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async getWithMetadata<T = unknown>(
    key: string
  ): Promise<{ value: string | null; metadata: T | null }> {
    const entry = this.store.get(key);
    if (!entry) return { value: null, metadata: null };
    return { value: entry.value, metadata: entry.metadata as T | null };
  }

  async put(
    key: string,
    value: string,
    options?: { expiration?: number; expirationTtl?: number; metadata?: unknown }
  ): Promise<void> {
    const expiration = options?.expiration ??
      (options?.expirationTtl ? Math.floor(Date.now() / 1000) + options.expirationTtl : undefined);
    this.store.set(key, { value, expiration, metadata: options?.metadata });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: Array<{ name: string; expiration?: number }>;
    list_complete: boolean;
    cursor?: string;
  }> {
    const keys = Array.from(this.store.entries())
      .filter(([k]) => !options?.prefix || k.startsWith(options.prefix))
      .slice(0, options?.limit ?? 1000)
      .map(([name, entry]) => ({ name, expiration: entry.expiration }));
    return { keys, list_complete: true };
  }

  /** Test helper — check if key exists */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /** Test helper — get raw store size */
  get size(): number {
    return this.store.size;
  }

  /** Test helper — clear all keys */
  clear(): void {
    this.store.clear();
  }
}

export function createMockKV(): MockKVNamespace {
  return new MockKVNamespace();
}
