/**
 * Maps domain color identifiers to Tailwind CSS class names.
 * Used to maintain consistent color-coding across the application.
 */

export function getDomainBorderColor(color: string): string {
  const colorMap: Record<string, string> = {
    'blue': 'border-l-blue-500',
    'green': 'border-l-green-500',
    'amber': 'border-l-amber-500',
    'purple': 'border-l-purple-500',
    'orange': 'border-l-orange-500',
    'red': 'border-l-red-500',
    'cyan': 'border-l-cyan-500',
    'pink': 'border-l-pink-500',
  };
  return colorMap[color] || 'border-l-primary';
}
