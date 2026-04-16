import type { GetMemConfig, IngestResponse, GetResponse, HealthResponse, MessageIn } from './types';
export declare class GetMemError extends Error {
    status: number;
    body: string;
    constructor(message: string, status: number, body: string);
}
export declare class GetMem {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    constructor(config: GetMemConfig);
    /**
     * Retrieve relevant memory context for a query.
     *
     * Returns a ready-to-use `context` string that can be injected
     * directly into an LLM system prompt, plus individual memory items
     * with relevance scores.
     */
    getContext(userId: string, query: string): Promise<GetResponse>;
    /**
     * Ingest conversation messages into memory.
     *
     * The service extracts facts, entities, and observations
     * asynchronously after accepting the request.
     */
    ingest(userId: string, messages: MessageIn[], sessionId?: string): Promise<IngestResponse>;
    /**
     * Convenience: ingest a single user+assistant exchange.
     */
    ingestConversation(userId: string, userMessage: string, assistantMessage: string, sessionId?: string): Promise<IngestResponse>;
    /**
     * Health check. Returns service status and component health.
     */
    health(): Promise<HealthResponse>;
    private request;
    private post;
    private get;
}
//# sourceMappingURL=client.d.ts.map