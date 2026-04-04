import { notFound } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ExamProvider } from '@/contexts/ExamContext';
import { getExamById, validateExamId } from '@/lib/content/exam-loader';
import { getSidebarHierarchyWithProgress } from '@/lib/content/sidebar';

interface ExamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ exam: string }>;
}

export default async function ExamLayout({ children, params }: ExamLayoutProps) {
  const { exam: examId } = await params;

  // Validate exam exists
  if (!validateExamId(examId)) {
    notFound();
  }

  // Load exam config
  const examConfig = getExamById(examId);
  if (!examConfig) {
    notFound();
  }

  // Load sidebar hierarchy enriched with progress data for this exam
  const sidebarHierarchy = getSidebarHierarchyWithProgress(examId);

  return (
    <ExamProvider examId={examId} config={examConfig}>
      <AppLayout sidebarHierarchy={sidebarHierarchy} examId={examId}>
        {children}
      </AppLayout>
    </ExamProvider>
  );
}
