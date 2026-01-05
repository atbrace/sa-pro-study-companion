'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  FlaskConical,
  TrendingUp,
  GraduationCap
} from 'lucide-react';

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
    href: '/study',
    label: 'Study',
    icon: BookOpen,
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
}

export function MobileSidebar({ onNavigate }: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      {/* Logo/Brand */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <span className="text-sm font-semibold">AWS SAP</span>
          <span className="text-xs text-muted-foreground">Study Companion</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-4">
        <div className="rounded-lg bg-muted p-3 text-xs">
          <p className="font-medium">SAP-C02 Exam</p>
          <p className="text-muted-foreground mt-1">
            4 domains • 85% target mastery
          </p>
        </div>
      </div>
    </div>
  );
}
