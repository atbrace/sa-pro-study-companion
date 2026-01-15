'use client';

import { SidebarContent } from './SidebarContent';
import type { SidebarHierarchy } from '@/types/sidebar';

interface SidebarProps {
  sidebarHierarchy: SidebarHierarchy;
  examId: string;
}

export function Sidebar({ sidebarHierarchy, examId }: SidebarProps) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-64 lg:border-r lg:bg-card">
      <SidebarContent sidebarHierarchy={sidebarHierarchy} examId={examId} />
    </aside>
  );
}
