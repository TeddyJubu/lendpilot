/**
 * Mock for Cloudflare Browser Rendering binding (Fetcher type).
 * Returns configurable HTML responses.
 */
export class MockBrowserFetcher {
  private responses = new Map<string, { status: number; body: string }>();
  public calls: Array<{ url: string; init?: RequestInit }> = [];
  private defaultResponse = { status: 200, body: "<html><body>Mock Page</body></html>" };
  private shouldError = false;

  /** Configure response for a URL (substring match) */
  mockUrl(urlSubstring: string, status: number, body: string): void {
    this.responses.set(urlSubstring, { status, body });
  }

  /** Make the browser fetcher throw a network error */
  setError(shouldError: boolean): void {
    this.shouldError = shouldError;
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const url = typeof input === "string" ? input : input.toString();

    if (this.shouldError) {
      throw new Error("Browser rendering connection failed");
    }

    this.calls.push({ url, init });

    // Find matching response by URL substring
    for (const [pattern, response] of this.responses.entries()) {
      if (url.includes(pattern)) {
        return new Response(response.body, { status: response.status });
      }
    }

    return new Response(this.defaultResponse.body, { status: this.defaultResponse.status });
  }

  reset(): void {
    this.responses.clear();
    this.calls = [];
    this.shouldError = false;
  }
}

export function createMockBrowser(): MockBrowserFetcher {
  return new MockBrowserFetcher();
}
