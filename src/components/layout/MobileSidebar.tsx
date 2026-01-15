'use client';

import { SidebarContent } from './SidebarContent';
import type { SidebarHierarchy } from '@/types/sidebar';

interface MobileSidebarProps {
  onNavigate?: () => void;
  sidebarHierarchy: SidebarHierarchy;
  examId: string;
}

export function MobileSidebar({ onNavigate, sidebarHierarchy, examId }: MobileSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      <SidebarContent sidebarHierarchy={sidebarHierarchy} examId={examId} onNavigate={onNavigate} />
    </div>
  );
}
