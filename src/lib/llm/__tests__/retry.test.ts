import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../retry';
import { LLMError } from '../types';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const promise = withRetry(fn);
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on retryable LLMError', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limit', 'claude', 429, true))
      .mockResolvedValue('success');

    const promise = withRetry(fn);
    await vi.advanceTimersByTimeAsync(1000); // First retry delay
    const result = await promise;

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new LLMError('Auth error', 'claude', 401, false));

    await expect(withRetry(fn)).rejects.toThrow('Auth error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses exponential backoff delays', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limit', 'claude', 429, true))
      .mockRejectedValueOnce(new LLMError('Rate limit', 'claude', 429, true))
      .mockResolvedValue('success');

    const promise = withRetry(fn);

    // First retry after 1s
    await vi.advanceTimersByTimeAsync(1000);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after 2s (exponential)
    await vi.advanceTimersByTimeAsync(2000);
    expect(fn).toHaveBeenCalledTimes(3);

    await expect(promise).resolves.toBe('success');
  });

  it('stops after max retries', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new LLMError('Rate limit', 'claude', 429, true));

    const promise = withRetry(fn, { maxRetries: 2 });

    // Catch the rejection to prevent unhandled rejection warning
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    promise.catch(() => {});

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(1000); // Retry 1
    await vi.advanceTimersByTimeAsync(2000); // Retry 2

    await expect(promise).rejects.toThrow('Rate limit');
    expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('does not retry non-LLMError exceptions', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(withRetry(fn)).rejects.toThrow('Network error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('respects custom baseDelayMs', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limit', 'gemini', 429, true))
      .mockResolvedValue('success');

    const promise = withRetry(fn, { baseDelayMs: 500 });

    // Should not resolve after 400ms
    await vi.advanceTimersByTimeAsync(400);
    expect(fn).toHaveBeenCalledTimes(1);

    // Should resolve after 500ms total
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('respects custom maxRetries', async () => {
    const fn = vi
      .fn()
      .mockRejectedValue(new LLMError('Rate limit', 'claude', 429, true));

    const promise = withRetry(fn, { maxRetries: 1 });

    // Catch the rejection to prevent unhandled rejection warning
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).rejects.toThrow('Rate limit');
    expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
  });

  it('caps delay at maxDelayMs to prevent indefinite blocking', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new LLMError('Rate limit', 'claude', 429, true))
      .mockRejectedValueOnce(new LLMError('Rate limit', 'claude', 429, true))
      .mockRejectedValueOnce(new LLMError('Rate limit', 'claude', 429, true))
      .mockResolvedValue('success');

    // With baseDelay=10000 and maxDelay=15000, the delays should be:
    // Attempt 1: min(10000 * 2^0, 15000) = min(10000, 15000) = 10000
    // Attempt 2: min(10000 * 2^1, 15000) = min(20000, 15000) = 15000 (capped!)
    // Attempt 3: min(10000 * 2^2, 15000) = min(40000, 15000) = 15000 (capped!)
    const promise = withRetry(fn, {
      maxRetries: 5,
      baseDelayMs: 10000,
      maxDelayMs: 15000,
    });

    // First retry after 10s (uncapped)
    await vi.advanceTimersByTimeAsync(10000);
    expect(fn).toHaveBeenCalledTimes(2);

    // Second retry after 15s (capped from 20s)
    await vi.advanceTimersByTimeAsync(15000);
    expect(fn).toHaveBeenCalledTimes(3);

    // Third retry after 15s (capped from 40s)
    await vi.advanceTimersByTimeAsync(15000);
    expect(fn).toHaveBeenCalledTimes(4);

    const result = await promise;
    expect(result).toBe('success');
  });
});
