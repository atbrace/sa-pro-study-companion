'use client';

import Link from 'next/link';
import { clsx } from 'clsx';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { ContentSection } from '@/types/domain';

interface SectionTabsProps {
  sections: Array<Pick<ContentSection, 'id' | 'title'>>;
  currentSlug: string;
  domainId: string;
  topicId: string;
}

export function SectionTabs({ sections, currentSlug, domainId, topicId }: SectionTabsProps) {
  return (
    <div className="mb-8">
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {sections.map((section) => {
            const isActive = section.id === currentSlug;
            const href = `/study/${domainId}/${topicId}/${section.id}`;

            return (
              <Link
                key={section.id}
                href={href}
                className={clsx(
                  'px-4 py-2 rounded-lg border whitespace-nowrap transition-colors text-sm font-medium',
                  isActive && 'bg-primary text-primary-foreground border-primary',
                  !isActive && 'bg-background hover:bg-muted border-border'
                )}
              >
                {section.title}
              </Link>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
