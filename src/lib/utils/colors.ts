/**
 * Domain color mapping for inline styles.
 * Tailwind cannot handle dynamic class names (e.g., `border-${color}-500`),
 * so we map domain color strings to hex values for use with style={{ }}.
 */
import { MASTERY_THRESHOLD, APPROACHING_THRESHOLD } from '@/lib/constants';

const DOMAIN_COLOR_HEX: Record<string, string> = {
  blue: '#3b82f6',
  purple: '#a855f7',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
};

/**
 * Get hex color for a domain color string.
 * Falls back to a neutral gray for unknown colors.
 */
export function getDomainColorHex(color: string): string {
  return DOMAIN_COLOR_HEX[color] || '#6b7280';
}

/**
 * Get background color class for mastery dot indicators.
 * Uses Tailwind classes since these are static (known at build time).
 */
export function getMasteryDotColorClass(score: number): string {
  if (score >= MASTERY_THRESHOLD) return 'bg-green-500';
  if (score >= APPROACHING_THRESHOLD) return 'bg-amber-500';
  if (score > 0) return 'bg-red-500';
  return 'bg-muted-foreground/30';
}
