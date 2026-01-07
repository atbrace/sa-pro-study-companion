'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorContext } from '@/contexts/TutorContext';

interface SectionHeaderProps {
  children: React.ReactNode;
  sectionTitle: string;
  sectionContent: string;
  domainId: string;
  domainName: string;
  topicId: string;
  topicName: string;
}

export function SectionHeader({
  children,
  sectionTitle,
  sectionContent,
  domainId,
  domainName,
  topicId,
  topicName,
}: SectionHeaderProps) {
  const { openTutor } = useTutorContext();

  const handleAskTutor = () => {
    // Truncate content if too long to avoid token limits
    const truncatedContent = sectionContent.length > 5000
      ? sectionContent.substring(0, 5000) + '\n\n[Content truncated...]'
      : sectionContent;

    openTutor({
      domainId,
      domainName,
      topicId,
      topicName,
      questionText: sectionTitle,
      currentContent: truncatedContent,
    });
  };

  return (
    <div className="group relative">
      <h2 className="text-2xl font-bold tracking-tight mb-4">
        {children}
      </h2>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleAskTutor}
        className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 max-md:opacity-100"
        aria-label={`Ask AI tutor about ${sectionTitle}`}
      >
        <MessageSquare className="h-4 w-4 text-primary" />
      </Button>
    </div>
  );
}
