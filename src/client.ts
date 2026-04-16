import type {
  GetMemConfig,
  IngestRequest,
  IngestResponse,
  GetRequest,
  GetResponse,
  HealthResponse,
  MessageIn,
} from './types';

const DEFAULT_BASE_URL = 'https://memory.getmem.ai';
const DEFAULT_TIMEOUT = 30_000;

export class GetMemError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: string,
  ) {
    super(message);
    this.name = 'GetMemError';
  }
}

export class GetMem {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: GetMemConfig) {
    if (!config.apiKey) {
      throw new Error('GetMem: apiKey is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = config.timeout || DEFAULT_TIMEOUT;
  }

  // --- Core API methods ---

  /**
   * Retrieve relevant memory context for a query.
   *
   * Returns a ready-to-use `context` string that can be injected
   * directly into an LLM system prompt, plus individual memory items
   * with relevance scores.
   */
  async getContext(userId: string, query: string): Promise<GetResponse> {
    const body: GetRequest = { user_id: userId, query };
    return this.post<GetResponse>('/v1/memory/get', body);
  }

  /**
   * Ingest conversation messages into memory.
   *
   * The service extracts facts, entities, and observations
   * asynchronously after accepting the request.
   */
  async ingest(userId: string, messages: MessageIn[], sessionId?: string): Promise<IngestResponse> {
    const body: IngestRequest = {
      user_id: userId,
      messages,
      session_id: sessionId ?? null,
    };
    return this.post<IngestResponse>('/v1/memory/ingest', body);
  }

  /**
   * Convenience: ingest a single user+assistant exchange.
   */
  async ingestConversation(
    userId: string,
    userMessage: string,
    assistantMessage: string,
    sessionId?: string,
  ): Promise<IngestResponse> {
    const now = new Date().toISOString();
    return this.ingest(
      userId,
      [
        { role: 'user', content: userMessage, timestamp: now },
        { role: 'assistant', content: assistantMessage, timestamp: now },
      ],
      sessionId,
    );
  }

  /**
   * Health check. Returns service status and component health.
   */
  async health(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/v1/health');
  }

  // --- Internal ---

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
      };
      const init: RequestInit = {
        method,
        headers,
        signal: controller.signal,
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }

      const res = await fetch(url, init);

      if (!res.ok) {
        const text = await res.text();
        throw new GetMemError(
          `GetMem API error: ${res.status} ${res.statusText}`,
          res.status,
          text,
        );
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
}
