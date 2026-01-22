import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Store original env values
const originalEnv = { ...process.env };

describe('provider factory', () => {
  beforeEach(() => {
    // Reset modules to clear cached provider
    vi.resetModules();
    // Reset env to original values
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe('getProvider', () => {
    it('returns claude provider by default', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      delete process.env.LLM_PROVIDER;

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      const provider = getProvider();
      expect(provider).toBeDefined();
      expect(typeof provider.chat).toBe('function');
      expect(typeof provider.continueWithToolResults).toBe('function');
    });

    it('throws on missing ANTHROPIC_API_KEY for claude', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      process.env.LLM_PROVIDER = 'claude';

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      expect(() => getProvider()).toThrow('ANTHROPIC_API_KEY required');
    });

    it('throws on missing GOOGLE_AI_API_KEY for gemini', async () => {
      delete process.env.GOOGLE_AI_API_KEY;
      process.env.LLM_PROVIDER = 'gemini';

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      expect(() => getProvider()).toThrow('GOOGLE_AI_API_KEY required');
    });

    it('throws on unknown provider', async () => {
      process.env.LLM_PROVIDER = 'unknown';

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      expect(() => getProvider()).toThrow('Unknown LLM provider: unknown');
    });

    it('caches provider instance', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.LLM_PROVIDER = 'claude';

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      const first = getProvider();
      const second = getProvider();
      expect(first).toBe(second);
    });

    it('returns gemini provider when configured', async () => {
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      process.env.LLM_PROVIDER = 'gemini';

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      const provider = getProvider();
      expect(provider).toBeDefined();
    });
  });

  describe('getProviderName', () => {
    it('returns claude by default', async () => {
      delete process.env.LLM_PROVIDER;

      const { getProviderName } = await import('../provider');

      expect(getProviderName()).toBe('claude');
    });

    it('returns configured provider', async () => {
      process.env.LLM_PROVIDER = 'gemini';

      const { getProviderName } = await import('../provider');

      expect(getProviderName()).toBe('gemini');
    });
  });

  describe('resetProvider', () => {
    it('clears cached provider', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      process.env.LLM_PROVIDER = 'claude';

      const { getProvider, resetProvider } = await import('../provider');
      resetProvider();

      const first = getProvider();

      // Reset and change config
      resetProvider();
      process.env.GOOGLE_AI_API_KEY = 'test-key';
      process.env.LLM_PROVIDER = 'gemini';

      const second = getProvider();
      expect(first).not.toBe(second);
    });
  });
});
