'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ContentSection } from '@/types/domain';

interface SectionNavigationProps {
  prevSection: Pick<ContentSection, 'id' | 'title'> | null;
  nextSection: Pick<ContentSection, 'id' | 'title'> | null;
  examId: string;
  domainId: string;
  topicId: string;
}

export function SectionNavigation({
  prevSection,
  nextSection,
  examId,
  domainId,
  topicId,
}: SectionNavigationProps) {
  return (
    <div className="flex items-center justify-between py-6 border-t border-b my-8">
      {prevSection ? (
        <Button variant="outline" asChild>
          <Link href={`/${examId}/study/${domainId}/${topicId}/${prevSection.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            <span className="max-w-[200px] truncate">{prevSection.title}</span>
          </Link>
        </Button>
      ) : (
        <div />
      )}

      {nextSection ? (
        <Button variant="default" asChild>
          <Link href={`/${examId}/study/${domainId}/${topicId}/${nextSection.id}`}>
            <span className="max-w-[200px] truncate">{nextSection.title}</span>
            <ChevronRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      ) : (
        <div />
      )}
    </div>
  );
}
