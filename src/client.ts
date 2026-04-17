import type {
  GetMemConfig,
  IngestRequest,
  IngestResponse,
  GetRequest,
  GetResponse,
  HealthResponse,
  MessageIn,
} from './types';
import {
  GetMemError, ConnectionError, TimeoutError,
  RateLimitedError, InternalError, ServiceUnavailableError,
  raiseForResponse,
} from './errors';

const DEFAULT_BASE_URL = 'https://memory.getmem.ai';
const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_RETRIES = 3;

const RETRYABLE = [RateLimitedError, InternalError, ServiceUnavailableError];

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(err: unknown): err is RateLimitedError | InternalError | ServiceUnavailableError {
  return RETRYABLE.some(Cls => err instanceof Cls);
}

export { GetMemError };

export class GetMem {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  constructor(config: GetMemConfig) {
    if (!config.apiKey) throw new Error('GetMem: apiKey is required');
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Retrieve relevant memory context for a query.
   * Returns context string ready for LLM system prompt + memory items + meta.
   */
  async getContext(userId: string, query: string): Promise<GetResponse> {
    const body: GetRequest = { user_id: userId, query };
    return this.post<GetResponse>('/v1/memory/get', body);
  }

  /**
   * Ingest conversation messages into memory.
   * Extraction runs asynchronously — returns immediately.
   */
  async ingest(userId: string, messages: MessageIn[], sessionId?: string): Promise<IngestResponse> {
    const body: IngestRequest = { user_id: userId, messages, session_id: sessionId ?? null };
    return this.post<IngestResponse>('/v1/memory/ingest', body);
  }

  /**
   * Convenience: ingest a single user + assistant exchange.
   */
  async ingestConversation(
    userId: string,
    userMessage: string,
    assistantMessage: string,
    sessionId?: string,
  ): Promise<IngestResponse> {
    const now = new Date().toISOString();
    return this.ingest(userId, [
      { role: 'user', content: userMessage, timestamp: now },
      { role: 'assistant', content: assistantMessage, timestamp: now },
    ], sessionId);
  }

  /** Health check — returns service status and component health. */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/v1/health');
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
        const init: RequestInit = {
          method,
          headers,
          signal: controller.signal,
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        };

        const res = await fetch(url, init);

        if (!res.ok) {
          let errBody: Record<string, unknown> = {};
          try { errBody = await res.json(); } catch { /* ignore */ }
          // raiseForResponse always throws
          raiseForResponse(res.status, errBody);
        }

        return await res.json() as T;

      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
        }

        if (isRetryable(err) && attempt < this.maxRetries) {
          let waitMs: number;
          if (err instanceof RateLimitedError) {
            waitMs = err.retryAfter * 1000;
          } else if (err instanceof ServiceUnavailableError) {
            waitMs = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
          } else {
            waitMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          }
          await sleep(waitMs);
          continue;
        }

        if (err instanceof GetMemError) throw err;

        // Network-level error
        const msg = err instanceof Error ? err.message : String(err);
        throw new ConnectionError(`Network error: ${msg}`);

      } finally {
        clearTimeout(timer);
      }
    }

    // Should never reach here
    throw new GetMemError('Max retries exceeded');
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
}
