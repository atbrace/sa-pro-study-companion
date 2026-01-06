'use client';

import { TutorPanel } from '@/components/tutor/TutorPanel';
import { useTutor } from '@/hooks/useTutor';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isOpen, context, openTutor, closeTutor } = useTutor();

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
      <Sidebar />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header onTutorToggle={handleTutorToggle} />

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* AI Tutor Panel */}
      <TutorPanel
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeTutor();
        }}
        context={context}
      />
    </div>
  );
}
