import type { ProviderName } from './llm/types';

const VALID_PROVIDERS: readonly ProviderName[] = ['claude', 'gemini'];

interface EnvValidationResult {
  provider: ProviderName;
  warnings: string[];
  errors: string[];
}

/**
 * Validate LLM-related environment variables.
 * Returns structured results so callers can decide how to handle warnings vs errors.
 */
export function validateLLMEnv(): EnvValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  const rawProvider = process.env.LLM_PROVIDER;
  let provider: ProviderName = 'claude';

  if (!rawProvider) {
    warnings.push(
      'LLM_PROVIDER is not set. Defaulting to "claude". AI tutor features require a valid provider and API key.'
    );
  } else if (!VALID_PROVIDERS.includes(rawProvider as ProviderName)) {
    errors.push(
      `Unknown LLM_PROVIDER: "${rawProvider}". Valid options: ${VALID_PROVIDERS.join(', ')}`
    );
    return { provider, warnings, errors };
  } else {
    provider = rawProvider as ProviderName;
  }

  if (provider === 'claude' && !process.env.ANTHROPIC_API_KEY) {
    errors.push(
      'ANTHROPIC_API_KEY is required when LLM_PROVIDER=claude. Set it in .env.local to enable AI tutor features.'
    );
  }

  if (provider === 'gemini' && !process.env.GOOGLE_AI_API_KEY) {
    errors.push(
      'GOOGLE_AI_API_KEY is required when LLM_PROVIDER=gemini. Set it in .env.local to enable AI tutor features.'
    );
  }

  return { provider, warnings, errors };
}

/**
 * Run env validation and log results. Throws on errors if strict mode is enabled.
 * In startup context (instrumentation), we warn but don't crash — the app works for
 * study content without LLM. The provider factory still throws on actual use.
 */
export function validateAndLogEnv(options: { strict?: boolean } = {}): void {
  const { warnings, errors } = validateLLMEnv();

  for (const warning of warnings) {
    console.warn(`[env] WARNING: ${warning}`);
  }

  for (const error of errors) {
    if (options.strict) {
      throw new Error(error);
    }
    console.error(`[env] ERROR: ${error}`);
  }
}
