# @getmem/sdk

TypeScript SDK for [getmem.ai](https://getmem.ai) Memory API.

## Install

```bash
npm install @getmem/sdk
```

## Quick Start

```typescript
import { GetMem } from '@getmem/sdk';

const mem = new GetMem({
  apiKey: 'gm_live_...',
});

// Get memory context for an LLM prompt
const { context, memories, meta } = await mem.getContext('user-123', 'What do you know about me?');

console.log(context);        // ready-to-use context string for system prompt
console.log(meta.total_ms);  // request timing
```

## Usage with OpenAI

```typescript
import { GetMem } from '@getmem/sdk';
import OpenAI from 'openai';

const mem = new GetMem({ apiKey: 'gm_live_...' });
const openai = new OpenAI({ apiKey: 'sk-...' });

const userId = 'user-123';
const userMessage = 'Tell me something about my hobbies';

// 1. Get memory context
const { context } = await mem.getContext(userId, userMessage);

// 2. Call LLM with memory as context
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: `You are a helpful assistant.\n\n## Memory Context\n${context}` },
    { role: 'user', content: userMessage },
  ],
});

const reply = completion.choices[0].message.content!;

// 3. Save conversation to memory
await mem.ingestConversation(userId, userMessage, reply);
```

## API

### `new GetMem(config)`

| Option    | Type     | Default                        | Description         |
|-----------|----------|--------------------------------|---------------------|
| `apiKey`  | `string` | *required*                     | API key             |
| `baseUrl` | `string` | `https://memory.getmem.ai`     | API base URL        |
| `timeout` | `number` | `30000`                        | Request timeout, ms |

### `mem.getContext(userId, query)`

Retrieve relevant memory context. Returns:

```typescript
{
  context: string;          // ready for LLM system prompt
  memories: MemoryItem[];   // individual items with scores
  meta: ContextMeta;        // timings, token count, entities
}
```

### `mem.ingest(userId, messages, sessionId?)`

Ingest raw messages into memory.

```typescript
await mem.ingest('user-123', [
  { role: 'user', content: 'I like fishing', timestamp: new Date().toISOString() },
  { role: 'assistant', content: 'Great hobby!', timestamp: new Date().toISOString() },
], 'session-abc');
```

### `mem.ingestConversation(userId, userMessage, assistantMessage, sessionId?)`

Convenience method for a single user+assistant exchange.

```typescript
await mem.ingestConversation('user-123', 'I like fishing', 'Great hobby!');
```

### `mem.health()`

Health check. Returns service status and component health.

### Error handling

```typescript
import { GetMemError } from '@getmem/sdk';

try {
  await mem.getContext('user-123', 'hello');
} catch (e) {
  if (e instanceof GetMemError) {
    console.error(e.status, e.body);
  }
}
```

## Custom base URL

For local development or self-hosted instances:

```typescript
const mem = new GetMem({
  apiKey: 'gm_live_...',
  baseUrl: 'http://localhost:8001',
});
```
