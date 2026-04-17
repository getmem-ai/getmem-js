/**
 * getmem.ai SDK error hierarchy — matches API error catalog v2.0
 */
export interface ApiErrorDetails {
    [key: string]: unknown;
}
export declare class GetMemError extends Error {
    constructor(message: string);
}
export declare class APIError extends GetMemError {
    readonly errorCode: string;
    readonly details: ApiErrorDetails;
    readonly requestId: string;
    readonly statusCode: number;
    constructor(message: string, errorCode: string, details: ApiErrorDetails, requestId: string, statusCode: number);
}
/** 401 — API key missing, malformed, unknown, or deactivated. Do not retry. */
export declare class UnauthorizedError extends APIError {
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 402 — Monthly quota exhausted. Do not retry; check resetAt. */
export declare class QuotaExceededError extends APIError {
    get current(): number;
    get limit(): number;
    get resetAt(): string;
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 403 — API key lacks required scope. Do not retry. */
export declare class ForbiddenError extends APIError {
    get requiredScope(): string;
    get availableScopes(): string[];
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 404 — Resource not found. Do not retry. */
export declare class NotFoundError extends APIError {
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 422 — Request validation failed. Do not retry. */
export declare class ValidationError extends APIError {
    get fieldErrors(): unknown[];
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 429 — Rate limited. Retryable — wait retryAfter seconds. */
export declare class RateLimitedError extends APIError {
    get retryAfter(): number;
    get current(): number;
    get limit(): number;
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 500 — Unexpected server error. Retryable with exponential backoff. */
export declare class InternalError extends APIError {
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** 503 — Backend dependency unavailable. Retryable with exponential backoff. */
export declare class ServiceUnavailableError extends APIError {
    constructor(message: string, details: ApiErrorDetails, requestId: string);
}
/** Network-level failure before HTTP response. */
export declare class ConnectionError extends GetMemError {
    constructor(message: string);
}
/** Request timed out. */
export declare class TimeoutError extends GetMemError {
    constructor(message: string);
}
export declare function raiseForResponse(status: number, body: Record<string, unknown>): never;
//# sourceMappingURL=errors.d.ts.map