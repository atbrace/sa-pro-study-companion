'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

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

// Singleton highlighter
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-light', 'github-dark'],
      langs: SUPPORTED_LANGUAGES,
    });
  }
  return highlighterPromise;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'text', className }: CodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const highlight = async () => {
      try {
        const highlighter = await getHighlighter();
        // Normalize language names
        let lang: BundledLanguage = 'typescript';
        const normalizedLang = language.toLowerCase();

        if (SUPPORTED_LANGUAGES.includes(normalizedLang as BundledLanguage)) {
          lang = normalizedLang as BundledLanguage;
        } else if (normalizedLang === 'shell' || normalizedLang === 'sh') {
          lang = 'bash';
        } else if (normalizedLang === 'js') {
          lang = 'javascript';
        } else if (normalizedLang === 'ts') {
          lang = 'typescript';
        }

        const theme = resolvedTheme === 'dark' ? 'github-dark' : 'github-light';
        const html = highlighter.codeToHtml(code, { lang, theme });
        setHighlightedHtml(html);
      } catch (error) {
        console.error('Syntax highlighting error:', error);
      }
    };

    highlight();
  }, [code, language, resolvedTheme, mounted]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [code]);

  // Show plain code before hydration or if highlighting fails
  if (!mounted || !highlightedHtml) {
    return (
      <div className={`relative group my-4 ${className || ''}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
        >
          {copied ? (
            <Check className="h-3 w-3" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
        <pre className="bg-code border border-code-border rounded-md p-4 overflow-x-auto">
          <code className="text-sm font-mono">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={`relative group my-4 ${className || ''}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs bg-background/80 backdrop-blur-sm"
      >
        {copied ? (
          <Check className="h-3 w-3" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>
      <div
        className="rounded-md border border-code-border overflow-x-auto [&_pre]:p-4 [&_pre]:m-0 [&_pre]:bg-transparent [&_code]:text-sm [&_code]:font-mono"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
    </div>
  );
}

