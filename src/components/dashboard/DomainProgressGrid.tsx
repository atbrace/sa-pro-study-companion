import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { getDomainBorderColor } from "@/lib/utils/domain-colors";
import { getAllDomains } from "@/lib/content/loader";
import { getExamById } from "@/lib/content/exam-loader";
import { PlayCircle } from "lucide-react";
import type { DomainProgress } from "@/lib/progress/calculator";

interface DomainProgressGridProps {
  domains: DomainProgress[];
  isNewUser?: boolean;
  examId: string;
}

/**
 * Get domain color from content loader
 */
function getDomainColor(examId: string, domainId: string): string {
  const domains = getAllDomains(examId);
  const domain = domains.find(d => d.meta.id === domainId);
  return domain?.meta.color || "blue";
}

/**
 * Get mastery label based on score
 */
function getMasteryLabel(score: number): string {
  if (score >= 85) return "Mastered";
  if (score >= 60) return "Developing";
  if (score > 0) return "In Progress";
  return "Not Started";
}

export function DomainProgressGrid({ domains, isNewUser = false, examId }: DomainProgressGridProps) {
  const examConfig = getExamById(examId);
  const examName = examConfig?.shortName || examId.toUpperCase();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          {isNewUser ? `${examName} Exam Domains` : "Assessment Scores"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {isNewUser
            ? "Click a domain to start your first assessment"
            : "Click a domain to start a new assessment"}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {domains.map(domain => {
          const color = getDomainColor(examId, domain.domainId);
          const borderClass = getDomainBorderColor(color);
          const masteryLabel = getMasteryLabel(domain.masteryScore);

          return (
            <Link
              key={domain.domainId}
              href={`/${examId}/assess/${domain.domainId}`}
              className="block group"
            >
              <Card className={`border-l-4 ${borderClass} hover:bg-muted/50 transition-colors`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm truncate pr-2">
                      {domain.domainName}
                    </span>
                    <PlayCircle className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>

                  {isNewUser ? (
                    <p className="text-xs text-muted-foreground">
                      {domain.totalTopics} topics
                    </p>
                  ) : (
                    <>
                      <ProgressIndicator value={domain.masteryScore} className="h-2" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{masteryLabel}</span>
                        <span className="font-medium">{Math.round(domain.masteryScore)}%</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
