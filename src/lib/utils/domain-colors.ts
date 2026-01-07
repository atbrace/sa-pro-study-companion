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

export function getDomainTextColor(color: string): string {
  const colorMap: Record<string, string> = {
    'blue': 'text-blue-600',
    'green': 'text-green-600',
    'amber': 'text-amber-600',
    'purple': 'text-purple-600',
    'orange': 'text-orange-600',
    'red': 'text-red-600',
    'cyan': 'text-cyan-600',
    'pink': 'text-pink-600',
  };
  return colorMap[color] || 'text-primary';
}

export function getDomainBgColor(color: string): string {
  const colorMap: Record<string, string> = {
    'blue': 'bg-blue-50',
    'green': 'bg-green-50',
    'amber': 'bg-amber-50',
    'purple': 'bg-purple-50',
    'orange': 'bg-orange-50',
    'red': 'bg-red-50',
    'cyan': 'bg-cyan-50',
    'pink': 'bg-pink-50',
  };
  return colorMap[color] || 'bg-muted';
}
