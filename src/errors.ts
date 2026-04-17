/**
 * getmem.ai SDK error hierarchy — matches API error catalog v2.0
 */

export interface ApiErrorDetails {
  [key: string]: unknown;
}

export class GetMemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GetMemError';
  }
}

export class APIError extends GetMemError {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly details: ApiErrorDetails,
    public readonly requestId: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/** 401 — API key missing, malformed, unknown, or deactivated. Do not retry. */
export class UnauthorizedError extends APIError {
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'unauthorized', details, requestId, 401);
    this.name = 'UnauthorizedError';
  }
}

/** 402 — Monthly quota exhausted. Do not retry; check resetAt. */
export class QuotaExceededError extends APIError {
  get current(): number { return this.details.current as number ?? 0; }
  get limit(): number { return this.details.limit as number ?? 0; }
  get resetAt(): string { return this.details.reset_at as string ?? ''; }
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'quota_exceeded', details, requestId, 402);
    this.name = 'QuotaExceededError';
  }
}

/** 403 — API key lacks required scope. Do not retry. */
export class ForbiddenError extends APIError {
  get requiredScope(): string { return this.details.required_scope as string ?? ''; }
  get availableScopes(): string[] { return this.details.available_scopes as string[] ?? []; }
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'forbidden', details, requestId, 403);
    this.name = 'ForbiddenError';
  }
}

/** 404 — Resource not found. Do not retry. */
export class NotFoundError extends APIError {
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'not_found', details, requestId, 404);
    this.name = 'NotFoundError';
  }
}

/** 422 — Request validation failed. Do not retry. */
export class ValidationError extends APIError {
  get fieldErrors(): unknown[] { return this.details.field_errors as unknown[] ?? []; }
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'validation_error', details, requestId, 422);
    this.name = 'ValidationError';
  }
}

/** 429 — Rate limited. Retryable — wait retryAfter seconds. */
export class RateLimitedError extends APIError {
  get retryAfter(): number { return this.details.retry_after as number ?? 60; }
  get current(): number { return this.details.current as number ?? 0; }
  get limit(): number { return this.details.limit as number ?? 0; }
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'rate_limited', details, requestId, 429);
    this.name = 'RateLimitedError';
  }
}

/** 500 — Unexpected server error. Retryable with exponential backoff. */
export class InternalError extends APIError {
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'internal_error', details, requestId, 500);
    this.name = 'InternalError';
  }
}

/** 503 — Backend dependency unavailable. Retryable with exponential backoff. */
export class ServiceUnavailableError extends APIError {
  constructor(message: string, details: ApiErrorDetails, requestId: string) {
    super(message, 'service_unavailable', details, requestId, 503);
    this.name = 'ServiceUnavailableError';
  }
}

/** Network-level failure before HTTP response. */
export class ConnectionError extends GetMemError {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

/** Request timed out. */
export class TimeoutError extends GetMemError {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

const STATUS_MAP: Record<number, new (msg: string, details: ApiErrorDetails, reqId: string) => APIError> = {
  401: UnauthorizedError,
  402: QuotaExceededError,
  403: ForbiddenError,
  404: NotFoundError,
  422: ValidationError,
  429: RateLimitedError,
  500: InternalError,
  503: ServiceUnavailableError,
};

export function raiseForResponse(status: number, body: Record<string, unknown>): never {
  const Cls = STATUS_MAP[status];

  if (status === 422) {
    const fieldErrors = (body.detail as unknown[]) ?? [];
    const message = (fieldErrors as Array<{loc?: unknown[], msg?: string}>)
      .map(e => `${(e.loc ?? []).join('.')}: ${e.msg ?? ''}`)
      .join('; ') || 'Validation error';
    throw new ValidationError(message, { field_errors: fieldErrors }, '');
  }

  if (Cls) {
    throw new Cls(
      (body.message as string) ?? `HTTP ${status}`,
      (body.details as ApiErrorDetails) ?? {},
      (body.request_id as string) ?? '',
    );
  }

  throw new APIError(
    (body.message as string) ?? `HTTP ${status}`,
    (body.error as string) ?? '',
    (body.details as ApiErrorDetails) ?? {},
    (body.request_id as string) ?? '',
    status,
  );
}
