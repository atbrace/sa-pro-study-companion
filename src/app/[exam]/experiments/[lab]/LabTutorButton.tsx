'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTutorContext } from '@/contexts/TutorContext';
import { useExam } from '@/contexts/ExamContext';

interface LabTutorButtonProps {
  labId: string;
  labName: string;
}

export function LabTutorButton({ labId, labName }: LabTutorButtonProps) {
  const { openTutor } = useTutorContext();
  const { examId } = useExam();

  const handleAskTutor = () => {
    openTutor({
      examId,
      labId,
      labName,
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleAskTutor}
      className="gap-1.5"
      aria-label={`Ask AI tutor about ${labName}`}
    >
      <MessageSquare className="h-4 w-4 text-primary" />
      <span>Ask AI about this lab</span>
    </Button>
  );
}
