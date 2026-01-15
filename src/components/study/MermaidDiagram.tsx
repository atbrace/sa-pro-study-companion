'use client';

import { useEffect, useState, useId } from 'react';

interface MermaidDiagramProps {
  code: string;
}

let mermaidInitialized = false;

export function MermaidDiagram({ code }: MermaidDiagramProps) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const id = useId().replace(/:/g, '-');

  useEffect(() => {
    let cancelled = false;

    const renderDiagram = async () => {
      try {
        const mermaid = (await import('mermaid')).default;

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'neutral',
            securityLevel: 'loose',
            fontFamily: 'inherit',
          });
          mermaidInitialized = true;
        }

        const { svg } = await mermaid.render(`mermaid${id}`, code);

        if (!cancelled) {
          setSvg(svg);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Mermaid rendering error:', err);
          setError(err instanceof Error ? err.message : 'Failed to render diagram');
          setIsLoading(false);
        }
      }
    };

    renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) {
    return (
      <div className="my-6 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
        <p className="text-sm text-destructive mb-2">Failed to render diagram:</p>
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">{code}</pre>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="my-6 flex justify-center items-center bg-muted/30 rounded-lg p-8">
        <div className="text-sm text-muted-foreground">Loading diagram...</div>
      </div>
    );
  }

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto bg-muted/30 rounded-lg p-4 [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
