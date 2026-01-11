'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardCheck,
  FlaskConical,
  TrendingUp,
  GraduationCap,
  ArrowLeftRight
} from 'lucide-react';
import { StudyTreeNav } from './StudyTreeNav';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useExam } from '@/contexts/ExamContext';
import type { SidebarHierarchy } from '@/types/sidebar';

interface SidebarProps {
  sidebarHierarchy: SidebarHierarchy;
  examId: string;
}

export function Sidebar({ sidebarHierarchy, examId }: SidebarProps) {
  const pathname = usePathname();
  const { config } = useExam();

  const navItems = [
    {
      href: `/${examId}`,
      label: 'Dashboard',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      href: `/${examId}/assess`,
      label: 'Assessments',
      icon: ClipboardCheck,
    },
    {
      href: '/experiments',
      label: 'Labs',
      icon: FlaskConical,
    },
    {
      href: `/${examId}/progress`,
      label: 'Progress',
      icon: TrendingUp,
    },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:w-64 lg:border-r lg:bg-card">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">{config.shortName}</span>
          <span className="text-xs text-muted-foreground">Study Companion</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
        {/* Dashboard */}
        {navItems.slice(0, 1).map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}

        {/* Study Tree Navigation */}
        <StudyTreeNav hierarchy={sidebarHierarchy} examId={examId} />

        {/* Other nav items */}
        {navItems.slice(1).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-3">
        <div className="rounded-md bg-muted p-3 text-xs">
          <p className="font-medium">{config.shortName} Exam</p>
          <p className="text-muted-foreground mt-1">
            {config.domains.length} domains &middot; {config.masteryThreshold}% target mastery
          </p>
        </div>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Switch Exam
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
