/**
 * Centralized mastery utilities for consistent display across the application.
 * Consolidates mastery scoring, labeling, and formatting functions.
 */
import { MASTERY_THRESHOLD, APPROACHING_THRESHOLD } from '@/lib/constants';

/**
 * Get mastery score color class based on threshold
 */
export function getMasteryColorClass(score: number): string {
  if (score >= MASTERY_THRESHOLD) return "text-green-600";
  if (score >= APPROACHING_THRESHOLD) return "text-amber-600";
  if (score > 0) return "text-red-600";
  return "text-muted-foreground";
}

/**
 * Get mastery label based on score
 */
export function getMasteryLabel(score: number): string {
  if (score >= MASTERY_THRESHOLD) return "Mastered";
  if (score >= APPROACHING_THRESHOLD) return "Developing";
  if (score > 0) return "In Progress";
  return "Not Started";
}

/**
 * Get mastery status with label and badge variant for UI display
 */
export function getMasteryStatus(score: number): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  if (score >= MASTERY_THRESHOLD) return { label: "Exam Ready", variant: "default" };
  if (score >= APPROACHING_THRESHOLD) return { label: "Developing", variant: "secondary" };
  if (score > 0) return { label: "Building Foundation", variant: "outline" };
  return { label: "Not Started", variant: "outline" };
}

/**
 * Format study time in minutes to human-readable string
 */
export function formatStudyTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
