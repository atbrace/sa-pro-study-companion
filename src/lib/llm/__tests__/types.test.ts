import { describe, it, expect } from 'vitest';
import { LLMError } from '../types';

describe('LLMError', () => {
  it('creates error with all properties', () => {
    const error = new LLMError('Rate limit', 'claude', 429, true);
    expect(error.message).toBe('Rate limit');
    expect(error.provider).toBe('claude');
    expect(error.statusCode).toBe(429);
    expect(error.isRetryable).toBe(true);
    expect(error.name).toBe('LLMError');
  });

  it('defaults isRetryable to false', () => {
    const error = new LLMError('Error', 'gemini', 500);
    expect(error.isRetryable).toBe(false);
  });

  it('is instanceof Error', () => {
    const error = new LLMError('Error', 'claude');
    expect(error).toBeInstanceOf(Error);
  });

  it('handles undefined statusCode', () => {
    const error = new LLMError('Network error', 'gemini');
    expect(error.statusCode).toBeUndefined();
    expect(error.isRetryable).toBe(false);
  });
});
