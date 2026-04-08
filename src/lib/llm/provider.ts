import type { LLMProvider, ProviderName } from './types';
import { claudeProvider } from './providers/claude';
import { geminiProvider } from './providers/gemini';
import { validateLLMEnv } from '../env';

const providers: Record<ProviderName, LLMProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
};

let cachedProvider: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const { provider: name, errors } = validateLLMEnv();

  if (errors.length > 0) {
    throw new Error(errors[0]);
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
