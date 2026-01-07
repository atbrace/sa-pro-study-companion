'use client';

import { TutorPanel } from '@/components/tutor/TutorPanel';
import { useTutor } from '@/hooks/useTutor';
import { TutorProvider } from '@/contexts/TutorContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { SidebarHierarchy } from '@/types/sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebarHierarchy: SidebarHierarchy;
}

export function AppLayout({ children, sidebarHierarchy }: AppLayoutProps) {
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
      <Sidebar sidebarHierarchy={sidebarHierarchy} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          onTutorToggle={handleTutorToggle}
          sidebarHierarchy={sidebarHierarchy}
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
      />
    </div>
  );
}
