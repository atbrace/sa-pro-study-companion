'use client';

import dynamic from 'next/dynamic';

const CodeBlock = dynamic(
  () => import('./CodeBlock').then((mod) => mod.CodeBlock),
  {
    ssr: false,
    loading: () => (
      <div className="relative group my-4">
        <pre className="bg-code border border-code-border rounded-md p-4 overflow-x-auto">
          <code className="text-sm font-mono text-muted-foreground">Loading...</code>
        </pre>
      </div>
    ),
  }
);

interface ClientCodeBlockProps {
  code: string;
  language: string;
}

export function ClientCodeBlock({ code, language }: ClientCodeBlockProps) {
  return <CodeBlock code={code} language={language} />;
}
