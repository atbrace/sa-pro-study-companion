import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';
import { Separator } from '@/components/ui/separator';
import { ClientCodeBlock } from './ClientCodeBlock';

// Dynamic import with SSR disabled to avoid server-side mermaid issues
const MermaidDiagram = dynamic(
  () => import('./MermaidDiagram').then((mod) => mod.MermaidDiagram),
  {
    ssr: false,
    loading: () => (
      <div className="my-6 flex justify-center items-center bg-muted/30 rounded-lg p-8">
        <div className="text-sm text-muted-foreground">Loading diagram...</div>
      </div>
    ),
  }
);

interface StudyContentProps {
  content: string;
}

// Extract language from className like "language-typescript"
function extractLanguage(className?: string): string {
  if (!className) return 'text';
  const match = className.match(/language-(\w+)/);
  return match ? match[1] : 'text';
}

export function StudyContent({ content }: StudyContentProps) {
  return (
    <div className="study-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold tracking-tight mt-8 mb-6 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <>
              <Separator className="my-8 [&:first-child]:hidden" />
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                {children}
              </h2>
            </>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mt-6 mb-3">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mt-4 mb-2">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-base leading-7 mb-4">
              {children}
            </p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-base leading-7">
              {children}
            </li>
          ),

          // Code blocks with syntax highlighting
          code: ({ inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="bg-code px-1.5 py-0.5 rounded text-sm font-mono border border-code-border"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            const language = extractLanguage(className);
            const code = String(children).replace(/\n$/, '');

            // Render mermaid diagrams
            if (language === 'mermaid') {
              return <MermaidDiagram code={code} />;
            }

            return <ClientCodeBlock code={code} language={language} />;
          },
          pre: ({ children }: any) => {
            // Just return children - ClientCodeBlock handles the wrapper
            return <>{children}</>;
          },

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 py-2 my-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors"
            >
              {children}
            </a>
          ),

          // Tables
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto">
              <table className="w-full border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b-2 border-border">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-muted/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-sm">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-3 text-sm">
              {children}
            </td>
          ),

          // Horizontal rule
          hr: () => <Separator className="my-8" />,

          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">
              {children}
            </strong>
          ),

          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic">
              {children}
            </em>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
