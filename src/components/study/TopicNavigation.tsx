import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Topic } from '@/types/domain';

interface TopicNavigationProps {
  prevTopic: Topic | null;
  nextTopic: Topic | null;
  examId: string;
  domainId: string;
}

/**
 * Navigation between topics with prev/next and back to domain.
 */
export function TopicNavigation({ prevTopic, nextTopic, examId, domainId }: TopicNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-8 border-t">
      {prevTopic ? (
        <Button variant="outline" asChild>
          <Link href={`/${examId}/study/${domainId}/${prevTopic.meta.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            {prevTopic.meta.shortName}
          </Link>
        </Button>
      ) : (
        <div />
      )}

      <Button variant="outline" asChild>
        <Link href={`/${examId}/study/${domainId}`}>
          Back to Domain
        </Link>
      </Button>

      {nextTopic ? (
        <Button variant="outline" asChild>
          <Link href={`/${examId}/study/${domainId}/${nextTopic.meta.id}`}>
            {nextTopic.meta.shortName}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
