import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';
import type { TopicMeta } from '@/types/domain';

interface TopicHeaderProps {
  meta: TopicMeta;
}

/**
 * Header section for topic pages with title, difficulty badge, and time estimate.
 */
export function TopicHeader({ meta }: TopicHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className="capitalize">{meta.difficulty}</Badge>
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          ~{meta.estimatedStudyTime} min
        </Badge>
      </div>
      <h1 className="text-3xl font-bold tracking-tight mb-4">
        {meta.name}
      </h1>
      <p className="text-muted-foreground">{meta.description}</p>
    </div>
  );
}
