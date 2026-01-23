import { NextResponse } from 'next/server';
import { getProviderName } from '@/lib/llm';

export const runtime = 'nodejs';

/** Model ID to display name mapping */
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  // Claude 4.5 models (latest)
  'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
  'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
  'claude-opus-4-5-20251101': 'Claude Opus 4.5',
  // Claude 4.5 aliases
  'claude-sonnet-4-5': 'Claude Sonnet 4.5',
  'claude-haiku-4-5': 'Claude Haiku 4.5',
  'claude-opus-4-5': 'Claude Opus 4.5',
  // Claude 4 models (legacy)
  'claude-sonnet-4-20250514': 'Claude Sonnet 4',
  'claude-opus-4-20250514': 'Claude Opus 4',
  // Gemini 3 models
  'gemini-3-flash-preview': 'Gemini 3 Flash',
  'gemini-3-pro-preview': 'Gemini 3 Pro',
  'gemini-3-pro-image-preview': 'Gemini 3 Pro Image',
  // Gemini 2.5 models
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.5-pro': 'Gemini 2.5 Pro',
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash Lite',
  // Gemini 2.0 models
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
  'gemini-2.0-flash-lite': 'Gemini 2.0 Flash Lite',
};

/** Get the current model ID based on provider and env config */
function getCurrentModelId(): string {
  const provider = getProviderName();

  if (provider === 'claude') {
    return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
  }

  if (provider === 'gemini') {
    return process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
  }

  return provider;
}

/** Convert model ID to user-friendly display name */
function getDisplayName(modelId: string): string {
  if (MODEL_DISPLAY_NAMES[modelId]) {
    return MODEL_DISPLAY_NAMES[modelId];
  }

  // Fallback: convert model ID to readable format
  // e.g., "gemini-3-flash-preview" -> "Gemini 3 Flash Preview"
  return modelId
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET() {
  const providerName = getProviderName();
  const modelId = getCurrentModelId();
  const displayName = getDisplayName(modelId);

  return NextResponse.json({
    provider: providerName,
    model: modelId,
    displayName,
  });
}
