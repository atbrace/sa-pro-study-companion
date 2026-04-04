import { LLMError } from './types';

const QUOTA_FAILURE_TYPE = 'type.googleapis.com/google.rpc.QuotaFailure';
const RETRY_INFO_TYPE = 'type.googleapis.com/google.rpc.RetryInfo';

export interface GeminiErrorDetails {
  isQuotaExhaustion: boolean;
  retryAfterMs?: number;
  quotaMetric?: string;
}

/**
 * Parse Gemini API error response to detect quota exhaustion vs transient rate limiting.
 *
 * Gemini 429 responses include structured `details` with:
 * - `QuotaFailure`: daily/monthly quota depleted (persistent, should NOT retry)
 * - `RetryInfo`: suggested retry delay
 *
 * A 429 with QuotaFailure means the quota is exhausted. A 429 without it is a
 * transient rate limit that will resolve with backoff.
 */
export function parseGeminiErrorDetails(errorBody: unknown): GeminiErrorDetails {
  if (!errorBody || typeof errorBody !== 'object') {
    return { isQuotaExhaustion: false };
  }

  const body = errorBody as Record<string, unknown>;
  const error = body.error as Record<string, unknown> | undefined;
  const details = (error?.details ?? []) as Array<Record<string, unknown>>;

  if (!Array.isArray(details)) {
    return { isQuotaExhaustion: false };
  }

  let isQuotaExhaustion = false;
  let retryAfterMs: number | undefined;
  let quotaMetric: string | undefined;

  for (const detail of details) {
    const type = detail['@type'] as string | undefined;

    if (type === QUOTA_FAILURE_TYPE) {
      isQuotaExhaustion = true;
      const violations = detail.violations as Array<Record<string, unknown>> | undefined;
      if (violations?.[0]?.quotaMetric) {
        quotaMetric = violations[0].quotaMetric as string;
      }
    }

    if (type === RETRY_INFO_TYPE && typeof detail.retryDelay === 'string') {
      retryAfterMs = parseRetryDelay(detail.retryDelay);
    }
  }

  return { isQuotaExhaustion, retryAfterMs, quotaMetric };
}

/** Parse a duration string like "53s" or "1.5s" to milliseconds */
function parseRetryDelay(delay: string): number | undefined {
  const match = delay.match(/^(\d+(?:\.\d+)?)s$/);
  if (!match) return undefined;
  return Math.round(parseFloat(match[1]) * 1000);
}

/** Type guard: is this error a quota exhaustion? */
export function isQuotaExhaustion(error: unknown): boolean {
  return error instanceof LLMError && error.code === 'quota_exhausted';
}
