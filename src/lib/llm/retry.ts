import { LLMError } from './types';

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60000; // Cap at 60 seconds to prevent indefinite blocking

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

/**
 * Retry a function with exponential backoff and full jitter for retryable LLMErrors.
 * Jitter prevents thundering herd when multiple requests retry simultaneously.
 * See: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? MAX_DELAY_MS;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Only retry if it's a retryable LLMError
      if (error instanceof LLMError && error.isRetryable && attempt < maxRetries) {
        // Equal jitter: half fixed + half random, guarantees a minimum delay
        // while still spreading retries to avoid thundering herd
        const ceiling = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        const half = ceiling / 2;
        const delayMs = half + Math.random() * half;
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
