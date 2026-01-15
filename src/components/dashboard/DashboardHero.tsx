import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, Sparkles, BookOpen } from "lucide-react";
import { getExamById } from "@/lib/content/exam-loader";
import { getMasteryStatus, getMasteryColorClass } from "@/lib/utils/mastery";
import type { DomainProgress, OverallProgress } from "@/lib/progress/calculator";

interface DashboardHeroProps {
  overall: OverallProgress;
  domains: DomainProgress[];
  examId: string;
}

/**
 * Get the appropriate CTA based on user state
 */
function getCTA(examId: string, overall: OverallProgress, domains: DomainProgress[]): {
  text: string;
  href: string;
  icon: React.ReactNode;
} {
  // New user - no questions attempted
  if (overall.questionsAttempted === 0) {
    return {
      text: "Start Your First Assessment",
      href: `/${examId}/assess`,
      icon: <Target className="h-5 w-5" />,
    };
  }

  // Exam ready - 85%+ mastery
  if (overall.masteryScore >= 85) {
    return {
      text: "Review Your Progress",
      href: `/${examId}/progress`,
      icon: <Sparkles className="h-5 w-5" />,
    };
  }

  // Has weak areas - find the weakest domain with unresolved weak areas
  const domainsWithWeakAreas = domains
    .filter(d => d.weakAreas.length > 0)
    .sort((a, b) => a.masteryScore - b.masteryScore);

  if (domainsWithWeakAreas.length > 0) {
    const weakest = domainsWithWeakAreas[0];
    return {
      text: `Continue ${weakest.domainName} Assessment`,
      href: `/${examId}/assess/${weakest.domainId}`,
      icon: <ArrowRight className="h-5 w-5" />,
    };
  }

  // Making progress but no specific weak areas identified
  // Find lowest mastery domain
  const lowestMasteryDomain = [...domains].sort((a, b) => a.masteryScore - b.masteryScore)[0];

  if (lowestMasteryDomain && lowestMasteryDomain.masteryScore < 85) {
    return {
      text: `Continue ${lowestMasteryDomain.domainName} Assessment`,
      href: `/${examId}/assess/${lowestMasteryDomain.domainId}`,
      icon: <ArrowRight className="h-5 w-5" />,
    };
  }

  // Default fallback
  return {
    text: "Continue Assessments",
    href: `/${examId}/assess`,
    icon: <ArrowRight className="h-5 w-5" />,
  };
}

export function DashboardHero({ overall, domains, examId }: DashboardHeroProps) {
  const isNewUser = overall.questionsAttempted === 0;
  const masteryStatus = getMasteryStatus(overall.masteryScore);
  const cta = getCTA(examId, overall, domains);
  const masteryColorClass = getMasteryColorClass(overall.masteryScore);
  const examConfig = getExamById(examId);
  const examName = examConfig?.shortName || examId.toUpperCase();
  const domainCount = examConfig?.domains.length || domains.length;
  const masteryThreshold = examConfig?.masteryThreshold || 85;

  if (isNewUser) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {examName} Study Companion
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Ready to begin your {examConfig?.name || 'certification'} journey?
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <BookOpen className="h-5 w-5" />
          <span>{domainCount} domains - {masteryThreshold}% mastery target</span>
        </div>

        <Button asChild size="lg" className="gap-2">
          <Link href={cta.href}>
            {cta.icon}
            {cta.text}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {examName} Study Companion
        </h1>
        <div className="flex items-center justify-center gap-4">
          <span className={`text-4xl font-bold ${masteryColorClass}`}>
            {Math.round(overall.masteryScore)}%
          </span>
          <Badge variant={masteryStatus.variant}>
            {masteryStatus.label}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          {overall.questionsAttempted} questions attempted - {overall.questionsCorrect} correct
        </p>
      </div>

      <Button asChild size="lg" className="gap-2">
        <Link href={cta.href}>
          {cta.icon}
          {cta.text}
        </Link>
      </Button>
    </div>
  );
}
