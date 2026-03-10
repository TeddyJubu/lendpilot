/**
 * In-memory D1Database mock.
 * Stores rows in plain JS arrays and executes real SQL-like operations
 * using simple pattern matching for common query shapes.
 */

export interface MockD1Result {
  results: Record<string, unknown>[];
  success: boolean;
  meta?: Record<string, unknown>;
}

type PreparedParams = unknown[];

interface StatementConfig {
  results?: Record<string, unknown>[];
  firstResult?: Record<string, unknown> | null;
  error?: string;
}

/**
 * A chainable mock statement.
 * Call `mockStatement.configure()` before running queries in tests.
 */
export class MockD1PreparedStatement {
  private params: PreparedParams = [];
  public capturedParams: PreparedParams[] = [];

  constructor(
    private sql: string,
    private config: StatementConfig = {}
  ) {}

  bind(...args: PreparedParams): this {
    this.params = args;
    this.capturedParams.push(args);
    return this;
  }

  async run(): Promise<{ success: boolean; meta: Record<string, unknown> }> {
    if (this.config.error) throw new Error(this.config.error);
    return { success: true, meta: {} };
  }

  async all(): Promise<MockD1Result> {
    if (this.config.error) throw new Error(this.config.error);
    return {
      results: this.config.results ?? [],
      success: true,
    };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    if (this.config.error) throw new Error(this.config.error);
    if (this.config.firstResult !== undefined) {
      return this.config.firstResult as T | null;
    }
    return (this.config.results?.[0] as T) ?? null;
  }
}

/**
 * Mock D1Database with configurable responses per SQL pattern.
 */
export class MockD1Database {
  private statements: Map<string, StatementConfig> = new Map();
  public preparedStatements: Array<{ sql: string; statement: MockD1PreparedStatement }> = [];

  /** Configure a response for any SQL that matches a substring */
  mockQuery(sqlSubstring: string, config: StatementConfig): void {
    this.statements.set(sqlSubstring, config);
  }

  /** Configure a single-row response */
  mockFirst(sqlSubstring: string, row: Record<string, unknown> | null): void {
    this.statements.set(sqlSubstring, { firstResult: row });
  }

  /** Configure a multi-row response */
  mockAll(sqlSubstring: string, rows: Record<string, unknown>[]): void {
    this.statements.set(sqlSubstring, { results: rows });
  }

  prepare(sql: string): MockD1PreparedStatement {
    // Find matching config by substring
    let config: StatementConfig = {};
    for (const [pattern, cfg] of this.statements.entries()) {
      if (sql.includes(pattern)) {
        config = cfg;
        break;
      }
    }
    const stmt = new MockD1PreparedStatement(sql, config);
    this.preparedStatements.push({ sql, statement: stmt });
    return stmt;
  }

  /** Reset all recorded calls and configurations */
  reset(): void {
    this.statements.clear();
    this.preparedStatements = [];
  }

  /** Get all SQL statements that were prepared */
  get preparedSqls(): string[] {
    return this.preparedStatements.map((s) => s.sql);
  }
}

export function createMockD1(): MockD1Database {
  return new MockD1Database();
}
