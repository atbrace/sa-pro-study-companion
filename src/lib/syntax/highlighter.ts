import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

let highlighter: Highlighter | null = null;

const SUPPORTED_LANGUAGES: BundledLanguage[] = [
  'typescript',
  'javascript',
  'json',
  'yaml',
  'bash',
  'python',
  'hcl',
  'tsx',
  'jsx',
  'css',
  'html',
  'sql',
  'shellscript',
];

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighter) {
    highlighter = await createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: SUPPORTED_LANGUAGES,
    });
  }
  return highlighter;
}

export async function highlightCode(
  code: string,
  lang: string,
  theme: 'light' | 'dark' = 'light'
): Promise<string> {
  const hl = await getHighlighter();

  // Normalize language names
  let validLang: BundledLanguage = 'typescript';
  const normalizedLang = lang.toLowerCase();

  if (SUPPORTED_LANGUAGES.includes(normalizedLang as BundledLanguage)) {
    validLang = normalizedLang as BundledLanguage;
  } else if (normalizedLang === 'shell' || normalizedLang === 'sh') {
    validLang = 'bash';
  } else if (normalizedLang === 'js') {
    validLang = 'javascript';
  } else if (normalizedLang === 'ts') {
    validLang = 'typescript';
  }

  return hl.codeToHtml(code, {
    lang: validLang,
    theme: theme === 'dark' ? 'github-dark' : 'github-light',
  });
}

export async function highlightCodeDual(
  code: string,
  lang: string
): Promise<{ light: string; dark: string }> {
  const [light, dark] = await Promise.all([
    highlightCode(code, lang, 'light'),
    highlightCode(code, lang, 'dark'),
  ]);
  return { light, dark };
}
