import type { GetMemConfig, IngestResponse, GetResponse, HealthResponse, MessageIn } from './types';
import { GetMemError } from './errors';
export { GetMemError };
export declare class GetMem {
    private readonly apiKey;
    private readonly baseUrl;
    private readonly timeout;
    private readonly maxRetries;
    constructor(config: GetMemConfig);
    /**
     * Retrieve relevant memory context for a query.
     * Returns context string ready for LLM system prompt + memory items + meta.
     */
    getContext(userId: string, query: string): Promise<GetResponse>;
    /**
     * Ingest conversation messages into memory.
     * Extraction runs asynchronously — returns immediately.
     */
    ingest(userId: string, messages: MessageIn[], sessionId?: string): Promise<IngestResponse>;
    /**
     * Convenience: ingest a single user + assistant exchange.
     */
    ingestConversation(userId: string, userMessage: string, assistantMessage: string, sessionId?: string): Promise<IngestResponse>;
    /** Health check — returns service status and component health. */
    health(): Promise<HealthResponse>;
    private request;
    private post;
    private get;
}
//# sourceMappingURL=client.d.ts.map