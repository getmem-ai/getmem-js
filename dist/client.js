const DEFAULT_BASE_URL = 'https://memory.getmem.ai';
const DEFAULT_TIMEOUT = 30000;
export class GetMemError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
        this.name = 'GetMemError';
    }
}
export class GetMem {
    constructor(config) {
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
    async getContext(userId, query) {
        const body = { user_id: userId, query };
        return this.post('/v1/memory/get', body);
    }
    /**
     * Ingest conversation messages into memory.
     *
     * The service extracts facts, entities, and observations
     * asynchronously after accepting the request.
     */
    async ingest(userId, messages, sessionId) {
        const body = {
            user_id: userId,
            messages,
            session_id: sessionId ?? null,
        };
        return this.post('/v1/memory/ingest', body);
    }
    /**
     * Convenience: ingest a single user+assistant exchange.
     */
    async ingestConversation(userId, userMessage, assistantMessage, sessionId) {
        const now = new Date().toISOString();
        return this.ingest(userId, [
            { role: 'user', content: userMessage, timestamp: now },
            { role: 'assistant', content: assistantMessage, timestamp: now },
        ], sessionId);
    }
    /**
     * Health check. Returns service status and component health.
     */
    async health() {
        return this.get('/v1/health');
    }
    // --- Internal ---
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        try {
            const headers = {
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
            };
            const init = {
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
                throw new GetMemError(`GetMem API error: ${res.status} ${res.statusText}`, res.status, text);
            }
            return (await res.json());
        }
        finally {
            clearTimeout(timer);
        }
    }
    post(path, body) {
        return this.request('POST', path, body);
    }
    get(path) {
        return this.request('GET', path);
    }
}
//# sourceMappingURL=client.js.map