/**
 * Workers AI mock.
 * Returns configurable responses for AI model calls.
 */
export class MockAi {
  private responses = new Map<string, unknown>();
  public calls: Array<{ model: string; params: unknown }> = [];
  private defaultResponse: unknown = { response: '{"rates":[]}' };
  private shouldThrow = false;
  private throwMessage = "AI error";

  /** Set response for a specific model */
  mockModel(model: string, response: unknown): void {
    this.responses.set(model, response);
  }

  /** Set a default response for all models */
  setDefaultResponse(response: unknown): void {
    this.defaultResponse = response;
  }

  /** Make AI throw an error */
  setError(message: string): void {
    this.shouldThrow = true;
    this.throwMessage = message;
  }

  /** Clear error state */
  clearError(): void {
    this.shouldThrow = false;
  }

  async run(model: string, params: unknown): Promise<unknown> {
    this.calls.push({ model, params });

    if (this.shouldThrow) {
      throw new Error(this.throwMessage);
    }

    return this.responses.get(model) ?? this.defaultResponse;
  }

  reset(): void {
    this.responses.clear();
    this.calls = [];
    this.defaultResponse = { response: '{"rates":[]}' };
    this.shouldThrow = false;
  }
}

export function createMockAi(): MockAi {
  return new MockAi();
}
