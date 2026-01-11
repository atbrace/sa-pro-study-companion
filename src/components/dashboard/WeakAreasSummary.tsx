import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, ArrowRight, BookOpen, HelpCircle } from "lucide-react";
import { getTopicById } from "@/lib/content/loader";
import type { DomainProgress } from "@/lib/progress/calculator";

interface WeakArea {
  domainId: string;
  domainName: string;
  topicId: string;
  topicName: string;
}

interface WeakAreasSummaryProps {
  domains: DomainProgress[];
  examId: string;
}

/**
 * Aggregate weak areas from all domains and return top 3
 */
function getTopWeakAreas(examId: string, domains: DomainProgress[]): WeakArea[] {
  const allWeakAreas: WeakArea[] = [];

  for (const domain of domains) {
    for (const weakArea of domain.weakAreas) {
      const topic = getTopicById(examId, domain.domainId, weakArea.topicId);
      if (topic) {
        allWeakAreas.push({
          domainId: domain.domainId,
          domainName: domain.domainName,
          topicId: weakArea.topicId,
          topicName: topic.meta.shortName || topic.meta.name,
        });
      }
    }
  }

  return allWeakAreas.slice(0, 3);
}

/**
 * Count total weak areas across all domains
 */
function getTotalWeakAreas(domains: DomainProgress[]): number {
  return domains.reduce((sum, d) => sum + d.weakAreas.length, 0);
}

export function WeakAreasSummary({ domains, examId }: WeakAreasSummaryProps) {
  const topWeakAreas = getTopWeakAreas(examId, domains);
  const totalWeakAreas = getTotalWeakAreas(domains);

  // Don't render anything if there are no weak areas
  if (topWeakAreas.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Focus Areas
          <span title="Topics where you scored below 60% on assessments. They resolve automatically when you reach 80% mastery.">
            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topWeakAreas.map(area => (
          <div
            key={`${area.domainId}-${area.topicId}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{area.topicName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {area.domainName}
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link href={`/${examId}/study/${area.domainId}/${area.topicId}`}>
                <BookOpen className="h-4 w-4 mr-1" />
                Study
              </Link>
            </Button>
          </div>
        ))}

        {totalWeakAreas > 3 && (
          <Link
            href={`/${examId}/progress`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            See all {totalWeakAreas} weak areas
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
