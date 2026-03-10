/**
 * In-memory R2Bucket mock.
 */
export class MockR2Object {
  constructor(
    public readonly key: string,
    private readonly body: string,
    public readonly httpMetadata?: Record<string, string>,
    public readonly customMetadata?: Record<string, string>
  ) {}

  async text(): Promise<string> {
    return this.body;
  }

  async json<T>(): Promise<T> {
    return JSON.parse(this.body) as T;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return new TextEncoder().encode(this.body).buffer;
  }
}

export class MockR2Bucket {
  private store = new Map<string, { body: string; metadata?: Record<string, string> }>();
  public puts: Array<{ key: string; body: string; options?: unknown }> = [];
  public deletes: string[] = [];

  async put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: {
      httpMetadata?: Record<string, string>;
      customMetadata?: Record<string, string>;
    }
  ): Promise<void> {
    const body = typeof value === "string" ? value : "[binary]";
    this.store.set(key, { body, metadata: options?.customMetadata });
    this.puts.push({ key, body, options });
  }

  async get(key: string): Promise<MockR2Object | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    return new MockR2Object(key, entry.body, undefined, entry.metadata);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.deletes.push(key);
  }

  async list(options?: { prefix?: string; limit?: number }): Promise<{
    objects: Array<{ key: string }>;
    truncated: boolean;
  }> {
    const objects = Array.from(this.store.keys())
      .filter((k) => !options?.prefix || k.startsWith(options.prefix))
      .slice(0, options?.limit ?? 1000)
      .map((key) => ({ key }));
    return { objects, truncated: false };
  }

  /** Test helper */
  has(key: string): boolean {
    return this.store.has(key);
  }

  get size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.puts = [];
    this.deletes = [];
  }
}

export function createMockR2(): MockR2Bucket {
  return new MockR2Bucket();
}
