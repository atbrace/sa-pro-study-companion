'use client';

import dynamic from 'next/dynamic';

const CodeBlock = dynamic(
  () => import('@/components/study/CodeBlock').then((mod) => mod.CodeBlock),
  {
    ssr: false,
    loading: () => (
      <pre className="bg-code border border-code-border rounded-md p-4 overflow-x-auto animate-pulse">
        <code className="text-sm font-mono text-muted-foreground">Loading...</code>
      </pre>
    ),
  }
);

interface LabCodeBlocksProps {
  code: string;
  language: string;
}

export function LabCodeBlocks({ code, language }: LabCodeBlocksProps) {
  return <CodeBlock code={code} language={language} />;
}
