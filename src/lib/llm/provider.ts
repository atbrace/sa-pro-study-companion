import type { LLMProvider, ProviderName } from './types';
import { claudeProvider } from './providers/claude';
import { geminiProvider } from './providers/gemini';

const providers: Record<ProviderName, LLMProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
};

let cachedProvider: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const name = (process.env.LLM_PROVIDER || 'claude') as ProviderName;

  if (!providers[name]) {
    throw new Error(
      `Unknown LLM provider: ${name}. Valid options: ${Object.keys(providers).join(', ')}`
    );
  }

  // Validate required env vars
  if (name === 'claude' && !process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY required when LLM_PROVIDER=claude');
  }
  if (name === 'gemini' && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY required when LLM_PROVIDER=gemini');
  }

  cachedProvider = providers[name];
  return cachedProvider;
}

export function getProviderName(): ProviderName {
  return (process.env.LLM_PROVIDER || 'claude') as ProviderName;
}

/**
 * Reset the cached provider (for testing only)
 */
export function resetProvider(): void {
  cachedProvider = null;
}
