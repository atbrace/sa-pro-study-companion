'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Separator } from '@/components/ui/separator';
import { SectionHeader } from './SectionHeader';

interface StudyContentWithTutorProps {
  content: string;
  sectionTitle: string;
  sectionContent: string;
  domainId: string;
  domainName: string;
  topicId: string;
  topicName: string;
}

export function StudyContentWithTutor({
  content,
  sectionTitle,
  sectionContent,
  domainId,
  domainName,
  topicId,
  topicName,
}: StudyContentWithTutorProps) {
  // Memoize components to prevent re-creation on every render
  const components = useMemo(() => ({
    // Headings
    h1: ({ children }: any) => (
      <h1 className="text-3xl font-bold tracking-tight mt-8 mb-6 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <>
        <Separator className="my-8 [&:first-child]:hidden" />
        <SectionHeader
          sectionTitle={String(children)}
          sectionContent={sectionContent}
          domainId={domainId}
          domainName={domainName}
          topicId={topicId}
          topicName={topicName}
        >
          {children}
        </SectionHeader>
      </>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-xl font-semibold mt-6 mb-3">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-lg font-semibold mt-4 mb-2">
        {children}
      </h4>
    ),

    // Paragraphs
    p: ({ children }: any) => (
      <p className="text-base leading-7 mb-4">
        {children}
      </p>
    ),

    // Lists
    ul: ({ children }: any) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-2">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="text-base leading-7">
        {children}
      </li>
    ),

    // Code blocks
    code: ({ inline, children, ...props }: any) => {
      if (inline) {
        return (
          <code
            className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono border"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="block bg-muted p-4 rounded-lg text-sm font-mono overflow-x-auto my-4 border"
          {...props}
        >
          {children}
        </code>
      );
    },
    pre: ({ children }: any) => (
      <pre className="my-4">
        {children}
      </pre>
    ),

    // Blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 italic text-muted-foreground">
        {children}
      </blockquote>
    ),

    // Links
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline hover:text-primary/80 transition-colors"
      >
        {children}
      </a>
    ),

    // Tables
    table: ({ children }: any) => (
      <div className="my-6 overflow-x-auto">
        <table className="w-full border-collapse">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="border-b-2 border-border">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody className="divide-y divide-border">
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="hover:bg-muted/50 transition-colors">
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-3 text-left font-semibold text-sm">
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-3 text-sm">
        {children}
      </td>
    ),

    // Horizontal rule
    hr: () => <Separator className="my-8" />,

    // Strong/Bold
    strong: ({ children }: any) => (
      <strong className="font-semibold text-foreground">
        {children}
      </strong>
    ),

    // Emphasis/Italic
    em: ({ children }: any) => (
      <em className="italic">
        {children}
      </em>
    ),
  }), [domainId, domainName, topicId, topicName, sectionContent, sectionTitle]);

  return (
    <div className="study-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
