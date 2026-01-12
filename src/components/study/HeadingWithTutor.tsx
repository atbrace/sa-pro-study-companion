'use client';

import { useMemo } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTutorContext } from '@/contexts/TutorContext';
import { useExam } from '@/contexts/ExamContext';
import { extractSubsectionContent } from '@/lib/content/subsection-extractor';

interface HeadingWithTutorProps {
  level: 2 | 3 | 4;
  children: React.ReactNode;
  fullContent: string;
  domainId: string;
  domainName: string;
  topicId: string;
  topicName: string;
}

export function HeadingWithTutor({
  level,
  children,
  fullContent,
  domainId,
  domainName,
  topicId,
  topicName,
}: HeadingWithTutorProps) {
  const { openTutor } = useTutorContext();
  const { examId } = useExam();
  const headingText = String(children);

  // Extract subsection content specific to this heading (memoized for performance)
  const subsectionContent = useMemo(
    () => extractSubsectionContent(fullContent, headingText, level),
    [fullContent, headingText, level]
  );

  const handleAskTutor = () => {
    openTutor({
      examId,
      domainId,
      domainName,
      topicId,
      topicName,
      questionText: headingText,
      currentContent: subsectionContent,
    });
  };

  // H2 heading with outline button and "Ask AI" text on desktop
  if (level === 2) {
    return (
      <h2 className="flex items-center text-2xl font-bold tracking-tight mb-4">
        <span className="flex-1">{children}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAskTutor}
          className="h-7 ml-3 gap-1.5 text-xs font-normal transition-colors flex-shrink-0"
          aria-label={`Ask AI tutor about ${headingText}`}
        >
          <MessageSquare className="h-4 w-4 max-md:mr-0 md:mr-0.5 text-primary" />
          <span className="max-md:hidden">Ask AI</span>
        </Button>
      </h2>
    );
  }

  // H3 heading with ghost button and tooltip
  if (level === 3) {
    return (
      <h3 className="flex items-center text-xl font-semibold mt-6 mb-3">
        <span className="flex-1">{children}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAskTutor}
              className="h-6 w-6 p-0 ml-2 transition-colors flex-shrink-0"
              aria-label={`Ask AI tutor about ${headingText}`}
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ask AI about {headingText}</p>
          </TooltipContent>
        </Tooltip>
      </h3>
    );
  }

  // H4 heading with ghost button, reduced opacity, and tooltip
  return (
    <h4 className="flex items-center text-lg font-semibold mt-4 mb-2">
      <span className="flex-1">{children}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAskTutor}
            className="h-5 max-md:h-6 w-5 max-md:w-6 p-0 ml-2 opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
            aria-label={`Ask AI tutor about ${headingText}`}
          >
            <MessageSquare className="h-3.5 w-3.5 max-md:h-4 max-md:w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ask AI about {headingText}</p>
        </TooltipContent>
      </Tooltip>
    </h4>
  );
}
