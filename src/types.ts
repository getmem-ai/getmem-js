// --- Request types ---

export interface IngestRequest {
  /** Unique user identifier */
  user_id: string;
  /** Conversation messages to ingest */
  messages: MessageIn[];
  /** Optional session identifier for grouping messages */
  session_id?: string | null;
}

export interface MessageIn {
  /** Message role: "user" | "assistant" | "system" */
  role: string;
  /** Message text content */
  content: string;
  /** ISO 8601 timestamp */
  timestamp?: string | null;
}

export interface GetRequest {
  /** Unique user identifier */
  user_id: string;
  /** Query to search memory for relevant context */
  query: string;
}

// --- Response types ---

export interface IngestResponse {
  status: string;
  memories_stored: number;
  extraction_queued: boolean;
  request_id: string;
}

export interface GetResponse {
  /** Ready-to-use context string for LLM system prompt */
  context: string;
  /** Individual memory items with scores */
  memories: MemoryItem[];
  /** Performance and search metadata */
  meta: ContextMeta;
}

export interface MemoryItem {
  id: string;
  type: string;
  text: string;
  relevance_score: number;
  source: string;
  created_at: string;
}

export interface ContextMeta {
  total_ms: number;
  decompose_ms: number;
  search_ms: number;
  graph_ms: number;
  enrich_ms: number;
  rank_ms: number;
  token_count: number;
  memory_count: number;
  entities_found: string[];
}

export interface HealthResponse {
  status: string;
  version: string;
  services: Record<string, string>;
}

// --- SDK config ---

export interface GetMemConfig {
  /** API key (Bearer token) */
  apiKey: string;
  /** Base URL override. Default: https://memory.getmem.ai */
  baseUrl?: string;
  /** Request timeout in ms. Default: 30000 */
  timeout?: number;
}
