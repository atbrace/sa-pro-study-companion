'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  ClipboardCheck,
  FlaskConical,
  TrendingUp,
  GraduationCap
} from 'lucide-react';
import { StudyTreeNav } from './StudyTreeNav';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import type { SidebarHierarchy } from '@/types/sidebar';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/assess',
    label: 'Assessments',
    icon: ClipboardCheck,
  },
  {
    href: '/experiments',
    label: 'Labs',
    icon: FlaskConical,
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: TrendingUp,
  },
];

interface MobileSidebarProps {
  onNavigate?: () => void;
  sidebarHierarchy: SidebarHierarchy;
}

export function MobileSidebar({ onNavigate, sidebarHierarchy }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">AWS SAP</span>
          <span className="text-xs text-muted-foreground">Study Companion</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-1 p-4">
        {/* Dashboard */}
        {navItems.slice(0, 1).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
        <StudyTreeNav hierarchy={sidebarHierarchy} onNavigate={onNavigate} />

        {/* Other nav items */}
        {navItems.slice(1).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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
          <p className="font-medium">SAP-C02 Exam</p>
          <p className="text-muted-foreground mt-1">
            4 domains &middot; 85% target mastery
          </p>
        </div>
        <ThemeToggle />
      </div>
    </div>
  );
}
