import { GetMemError, ConnectionError, TimeoutError, RateLimitedError, InternalError, ServiceUnavailableError, raiseForResponse, } from './errors';
const DEFAULT_BASE_URL = 'https://memory.getmem.ai';
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MAX_RETRIES = 3;
const RETRYABLE = [RateLimitedError, InternalError, ServiceUnavailableError];
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function isRetryable(err) {
    return RETRYABLE.some(Cls => err instanceof Cls);
}
export { GetMemError };
export class GetMem {
    constructor(config) {
        if (!config.apiKey)
            throw new Error('GetMem: apiKey is required');
        this.apiKey = config.apiKey;
        this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
        this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
        this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    }
    /**
     * Retrieve relevant memory context for a query.
     * Returns context string ready for LLM system prompt + memory items + meta.
     */
    async getContext(userId, query) {
        const body = { user_id: userId, query };
        return this.post('/v1/memory/get', body);
    }
    /**
     * Ingest conversation messages into memory.
     * Extraction runs asynchronously — returns immediately.
     */
    async ingest(userId, messages, sessionId) {
        const body = { user_id: userId, messages, session_id: sessionId ?? null };
        return this.post('/v1/memory/ingest', body);
    }
    /**
     * Convenience: ingest a single user + assistant exchange.
     */
    async ingestConversation(userId, userMessage, assistantMessage, sessionId) {
        const now = new Date().toISOString();
        return this.ingest(userId, [
            { role: 'user', content: userMessage, timestamp: now },
            { role: 'assistant', content: assistantMessage, timestamp: now },
        ], sessionId);
    }
    /** Health check — returns service status and component health. */
    async health() {
        return this.get('/v1/health');
    }
    // ── Internal ───────────────────────────────────────────────────────────────
    async request(method, path, body) {
        const url = `${this.baseUrl}${path}`;
        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeout);
            try {
                const headers = {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                };
                const init = {
                    method,
                    headers,
                    signal: controller.signal,
                    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
                };
                const res = await fetch(url, init);
                if (!res.ok) {
                    let errBody = {};
                    try {
                        errBody = await res.json();
                    }
                    catch { /* ignore */ }
                    // raiseForResponse always throws
                    raiseForResponse(res.status, errBody);
                }
                return await res.json();
            }
            catch (err) {
                if (err.name === 'AbortError') {
                    throw new TimeoutError(`Request timed out after ${this.timeout}ms`);
                }
                if (isRetryable(err) && attempt < this.maxRetries) {
                    let waitMs;
                    if (err instanceof RateLimitedError) {
                        waitMs = err.retryAfter * 1000;
                    }
                    else if (err instanceof ServiceUnavailableError) {
                        waitMs = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s
                    }
                    else {
                        waitMs = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
                    }
                    await sleep(waitMs);
                    continue;
                }
                if (err instanceof GetMemError)
                    throw err;
                // Network-level error
                const msg = err instanceof Error ? err.message : String(err);
                throw new ConnectionError(`Network error: ${msg}`);
            }
            finally {
                clearTimeout(timer);
            }
        }
        // Should never reach here
        throw new GetMemError('Max retries exceeded');
    }
    post(path, body) {
        return this.request('POST', path, body);
    }
    get(path) {
        return this.request('GET', path);
    }
}
//# sourceMappingURL=client.js.map