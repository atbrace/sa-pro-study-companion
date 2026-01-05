'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [tutorOpen, setTutorOpen] = useState(false);

  const handleTutorToggle = () => {
    setTutorOpen(!tutorOpen);
    // TODO: Implement tutor panel in Phase 3
    console.log('Tutor panel toggle:', !tutorOpen);
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

      {/* AI Tutor Panel - Will be implemented in Phase 3 */}
      {tutorOpen && (
        <div className="fixed bottom-4 right-4 rounded-lg border bg-card p-4 shadow-lg">
          <p className="text-sm text-muted-foreground">
            AI Tutor panel coming in Phase 3
          </p>
        </div>
      )}
    </div>
  );
}
