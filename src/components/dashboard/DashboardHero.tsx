import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Target, Sparkles, BookOpen } from "lucide-react";
import type { DomainProgress, OverallProgress } from "@/lib/progress/calculator";

interface DashboardHeroProps {
  overall: OverallProgress;
  domains: DomainProgress[];
}

/**
 * Get mastery status label based on score
 */
function getMasteryStatus(score: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (score >= 85) return { label: "Exam Ready", variant: "default" };
  if (score >= 60) return { label: "Developing", variant: "secondary" };
  if (score > 0) return { label: "Building Foundation", variant: "outline" };
  return { label: "Not Started", variant: "outline" };
}

/**
 * Get the appropriate CTA based on user state
 */
function getCTA(overall: OverallProgress, domains: DomainProgress[]): {
  text: string;
  href: string;
  icon: React.ReactNode;
} {
  // New user - no questions attempted
  if (overall.questionsAttempted === 0) {
    return {
      text: "Start Your First Assessment",
      href: "/assess",
      icon: <Target className="h-5 w-5" />,
    };
  }

  // Exam ready - 85%+ mastery
  if (overall.masteryScore >= 85) {
    return {
      text: "Review Your Progress",
      href: "/progress",
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
      href: `/assess/${weakest.domainId}`,
      icon: <ArrowRight className="h-5 w-5" />,
    };
  }

  // Making progress but no specific weak areas identified
  // Find lowest mastery domain
  const lowestMasteryDomain = [...domains].sort((a, b) => a.masteryScore - b.masteryScore)[0];

  if (lowestMasteryDomain && lowestMasteryDomain.masteryScore < 85) {
    return {
      text: `Continue ${lowestMasteryDomain.domainName} Assessment`,
      href: `/assess/${lowestMasteryDomain.domainId}`,
      icon: <ArrowRight className="h-5 w-5" />,
    };
  }

  // Default fallback
  return {
    text: "Continue Assessments",
    href: "/assess",
    icon: <ArrowRight className="h-5 w-5" />,
  };
}

/**
 * Get mastery score color class
 */
function getMasteryColorClass(score: number): string {
  if (score >= 85) return "text-green-600";
  if (score >= 60) return "text-amber-600";
  if (score > 0) return "text-red-600";
  return "text-muted-foreground";
}

export function DashboardHero({ overall, domains }: DashboardHeroProps) {
  const isNewUser = overall.questionsAttempted === 0;
  const masteryStatus = getMasteryStatus(overall.masteryScore);
  const cta = getCTA(overall, domains);
  const masteryColorClass = getMasteryColorClass(overall.masteryScore);

  if (isNewUser) {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            SAP-C02 Study Companion
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Ready to begin your AWS Solutions Architect Professional certification journey?
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <BookOpen className="h-5 w-5" />
          <span>4 domains - 85% mastery target</span>
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
          SAP-C02 Study Companion
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
