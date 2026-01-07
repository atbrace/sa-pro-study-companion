"use client"

import { cn } from '@/lib/utils';
import * as ProgressPrimitive from "@radix-ui/react-progress";

interface ProgressIndicatorProps {
  value: number;
  className?: string;
}

/**
 * Color-coded progress indicator following project standards:
 * - Green (≥85%): Mastery level - exam ready
 * - Amber (60-84%): Developing proficiency
 * - Red (<60%): Needs more practice
 */
export function ProgressIndicator({ value, className }: ProgressIndicatorProps) {
  const indicatorColorClass =
    value >= 85 ? 'bg-green-600' :
    value >= 60 ? 'bg-amber-500' :
    'bg-red-600';

  return (
    <ProgressPrimitive.Root
      className={cn(
        "relative h-4 w-full overflow-hidden rounded-full bg-secondary",
        className
      )}
      value={value}
    >
      <ProgressPrimitive.Indicator
        className={cn(
          "h-full w-full flex-1 transition-all",
          indicatorColorClass
        )}
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
