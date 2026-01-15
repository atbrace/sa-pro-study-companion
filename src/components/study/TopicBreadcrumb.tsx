import Link from 'next/link';

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface TopicBreadcrumbProps {
  segments: BreadcrumbSegment[];
}

/**
 * Breadcrumb navigation for topic pages.
 * Last segment is shown as plain text, others as links.
 */
export function TopicBreadcrumb({ segments }: TopicBreadcrumbProps) {
  return (
    <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;

        return (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span>/</span>}
            {isLast || !segment.href ? (
              <span className={isLast ? 'text-foreground' : undefined}>{segment.label}</span>
            ) : (
              <Link href={segment.href} className="hover:text-foreground">
                {segment.label}
              </Link>
            )}
          </span>
        );
      })}
    </div>
  );
}
