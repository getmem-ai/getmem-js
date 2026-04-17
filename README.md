# getmem

TypeScript/JavaScript SDK for [getmem.ai](https://getmem.ai) — persistent memory for AI agents.

[![npm version](https://img.shields.io/npm/v/getmem.svg)](https://npmjs.com/package/getmem)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Install

```bash
npm install getmem
```

## Quick Start

```typescript
import { GetMem } from 'getmem';

const mem = new GetMem({ apiKey: 'gm_live_...' });

// Before each LLM call — get relevant context
const { context } = await mem.getContext('user-123', userMessage);

// After each turn — save conversation to memory
await mem.ingestConversation('user-123', userMessage, reply);
```

## Usage with OpenAI

```typescript
import { GetMem } from 'getmem';
import OpenAI from 'openai';

const mem = new GetMem({ apiKey: 'gm_live_...' });
const openai = new OpenAI({ apiKey: 'sk-...' });

const userId = 'user-123';
const userMessage = 'Tell me about my preferences';

// 1. Get memory context
const { context } = await mem.getContext(userId, userMessage);

// 2. Call LLM with memory injected
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: `You are a helpful assistant.\n\n## Memory\n${context}` },
    { role: 'user', content: userMessage },
  ],
});
const reply = completion.choices[0].message.content!;

// 3. Save conversation to memory
await mem.ingestConversation(userId, userMessage, reply);
```

## API Reference

### `new GetMem(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | *required* | Your getmem API key |
| `baseUrl` | `string` | `https://memory.getmem.ai` | API base URL |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `maxRetries` | `number` | `3` | Max retries for retryable errors |

### `mem.getContext(userId, query)` → Promise<GetResponse>

Retrieve relevant memory context. Returns:

```typescript
{
  context: string;        // ready for LLM system prompt
  memories: MemoryItem[]; // individual items with relevance scores
  meta: ContextMeta;      // timings, token count, entities
}
```

### `mem.ingest(userId, messages, sessionId?)` → Promise<IngestResponse>

Ingest raw messages. Returns immediately — extraction is async.

```typescript
await mem.ingest('user-123', [
  { role: 'user', content: 'I love hiking', timestamp: new Date().toISOString() },
  { role: 'assistant', content: 'Great hobby!' },
]);
```

### `mem.ingestConversation(userId, userMessage, assistantMessage, sessionId?)` → Promise<IngestResponse>

Convenience method for a single user + assistant exchange.

### `mem.health()` → Promise<HealthResponse>

Health check — returns service status and component health.

### Error Handling

```typescript
import {
  UnauthorizedError,
  QuotaExceededError,
  RateLimitedError,
  ValidationError,
  InternalError,
  ServiceUnavailableError,
} from 'getmem';

try {
  const { context } = await mem.getContext('user-123', 'hello');
} catch (err) {
  if (err instanceof UnauthorizedError) {
    console.error('Check your API key');
  } else if (err instanceof QuotaExceededError) {
    console.error(`Quota resets at: ${err.resetAt}`);
  } else if (err instanceof RateLimitedError) {
    // SDK retries automatically
  }
}
```

**Retryable errors** (SDK retries automatically):

| Error | Strategy |
|-------|----------|
| `RateLimitedError` (429) | Sleep `retryAfter` seconds |
| `InternalError` (500) | Backoff: 1s, 2s, 4s |
| `ServiceUnavailableError` (503) | Backoff: 2s, 4s, 8s |

## Custom Base URL

```typescript
const mem = new GetMem({
  apiKey: 'gm_live_...',
  baseUrl: 'http://localhost:8001',
});
```

## Links

- **Docs & dashboard:** [platform.getmem.ai](https://platform.getmem.ai)
- **Website:** [getmem.ai](https://getmem.ai)
- **PyPI (Python):** [pypi.org/project/getmem-ai](https://pypi.org/project/getmem-ai/)
- **GitHub (Python SDK):** [github.com/getmem-ai/getmem](https://github.com/getmem-ai/getmem)
- **Issues:** [github.com/getmem-ai/getmem-js/issues](https://github.com/getmem-ai/getmem-js/issues)
