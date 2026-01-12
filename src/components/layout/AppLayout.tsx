'use client';

import { TutorPanel } from '@/components/tutor/TutorPanel';
import { useTutor } from '@/hooks/useTutor';
import { TutorProvider } from '@/contexts/TutorContext';
import { useExam } from '@/contexts/ExamContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { SidebarHierarchy } from '@/types/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebarHierarchy: SidebarHierarchy;
  examId: string;
}

export function AppLayout({ children, sidebarHierarchy, examId }: AppLayoutProps) {
  const { isOpen, context, openTutor, closeTutor } = useTutor();
  const { config: examConfig } = useExam();

  const handleTutorToggle = () => {
    if (isOpen) {
      closeTutor();
    } else {
      openTutor();
    }
  };

  return (
    <div className="min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar sidebarHierarchy={sidebarHierarchy} examId={examId} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          onTutorToggle={handleTutorToggle}
          sidebarHierarchy={sidebarHierarchy}
          examId={examId}
        />

        {/* Page content */}
        <main className="flex-1">
          <TutorProvider value={{ openTutor, closeTutor, isOpen }}>
            {children}
          </TutorProvider>
        </main>
      </div>

      {/* AI Tutor Panel */}
      <TutorPanel
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeTutor();
        }}
        context={context}
        examId={examId}
        examName={examConfig.name}
      />
    </div>
  );
}
