import { describe, it, expect } from 'vitest';
import { LLMError } from '../types';
import { isQuotaExhaustion, parseGeminiErrorDetails } from '../quota';

describe('LLMError code field', () => {
  it('defaults code to undefined for backward compatibility', () => {
    const error = new LLMError('Rate limit', 'gemini', 429, true);
    expect(error.code).toBeUndefined();
    expect(error.retryAfterMs).toBeUndefined();
  });

  it('accepts quota_exhausted code via options', () => {
    const error = new LLMError('Quota exhausted', 'gemini', 429, false, {
      code: 'quota_exhausted',
    });
    expect(error.code).toBe('quota_exhausted');
    expect(error.isRetryable).toBe(false);
    expect(error.statusCode).toBe(429);
  });

  it('accepts retryAfterMs via options', () => {
    const error = new LLMError('Rate limited', 'gemini', 429, true, {
      code: 'rate_limited',
      retryAfterMs: 30000,
    });
    expect(error.retryAfterMs).toBe(30000);
    expect(error.code).toBe('rate_limited');
  });
});

describe('parseGeminiErrorDetails', () => {
  it('detects QuotaFailure in error details', () => {
    const errorBody = {
      error: {
        code: 429,
        message: 'Resource has been exhausted',
        status: 'RESOURCE_EXHAUSTED',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
            violations: [
              {
                quotaMetric:
                  'generativelanguage.googleapis.com/generate_content_free_tier_requests',
                quotaId:
                  'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
                quotaValue: '20',
              },
            ],
          },
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '53s',
          },
        ],
      },
    };

    const result = parseGeminiErrorDetails(errorBody);
    expect(result.isQuotaExhaustion).toBe(true);
    expect(result.retryAfterMs).toBe(53000);
    expect(result.quotaMetric).toContain('free_tier_requests');
  });

  it('detects plain rate limiting (no QuotaFailure)', () => {
    const errorBody = {
      error: {
        code: 429,
        message: 'Too many requests',
        status: 'RESOURCE_EXHAUSTED',
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '2s',
          },
        ],
      },
    };

    const result = parseGeminiErrorDetails(errorBody);
    expect(result.isQuotaExhaustion).toBe(false);
    expect(result.retryAfterMs).toBe(2000);
  });

  it('handles missing details gracefully', () => {
    const result = parseGeminiErrorDetails({ error: { code: 429 } });
    expect(result.isQuotaExhaustion).toBe(false);
    expect(result.retryAfterMs).toBeUndefined();
  });

  it('handles null/undefined input', () => {
    expect(parseGeminiErrorDetails(null)).toEqual({
      isQuotaExhaustion: false,
    });
    expect(parseGeminiErrorDetails(undefined)).toEqual({
      isQuotaExhaustion: false,
    });
  });

  it('parses fractional retryDelay', () => {
    const errorBody = {
      error: {
        details: [
          {
            '@type': 'type.googleapis.com/google.rpc.RetryInfo',
            retryDelay: '1.5s',
          },
        ],
      },
    };

    const result = parseGeminiErrorDetails(errorBody);
    expect(result.retryAfterMs).toBe(1500);
  });
});

describe('isQuotaExhaustion', () => {
  it('returns true for errors with quota_exhausted code', () => {
    const error = new LLMError('Quota exhausted', 'gemini', 429, false, {
      code: 'quota_exhausted',
    });
    expect(isQuotaExhaustion(error)).toBe(true);
  });

  it('returns false for rate-limited errors', () => {
    const error = new LLMError('Rate limited', 'gemini', 429, true, {
      code: 'rate_limited',
    });
    expect(isQuotaExhaustion(error)).toBe(false);
  });

  it('returns false for errors without code', () => {
    const error = new LLMError('Rate limited', 'gemini', 429, true);
    expect(isQuotaExhaustion(error)).toBe(false);
  });

  it('returns false for non-LLMError', () => {
    expect(isQuotaExhaustion(new Error('test'))).toBe(false);
  });
});
