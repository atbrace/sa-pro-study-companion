import { Separator } from "@/components/ui/separator";
import { getProgressSummary } from "@/lib/progress/calculator";
import { getTipsForState, getAllTipsArray } from "@/lib/dashboard/tips";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DomainProgressGrid } from "@/components/dashboard/DomainProgressGrid";
import { WeakAreasSummary } from "@/components/dashboard/WeakAreasSummary";
import { TipCard } from "@/components/dashboard/TipCard";

export default function Home() {
  const progress = getProgressSummary();
  const isNewUser = progress.overall.questionsAttempted === 0;

  // Calculate whether user has any weak areas
  const hasWeakAreas = progress.domains.some(d => d.weakAreas.length > 0);

  // Get context-appropriate tips for initial display
  const initialTips = getTipsForState({
    questionsAttempted: progress.overall.questionsAttempted,
    masteryScore: progress.overall.masteryScore,
    hasWeakAreas,
  });

  // Get all tips for refresh functionality
  const allTips = getAllTipsArray();

  return (
    <div className="container py-8 lg:py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero Section with mastery score and adaptive CTA */}
        <DashboardHero overall={progress.overall} domains={progress.domains} />

        <Separator />

        {/* Domain Progress Grid */}
        <DomainProgressGrid domains={progress.domains} isNewUser={isNewUser} />

        {/* Weak Areas Summary - only shown if user has weak areas */}
        {!isNewUser && <WeakAreasSummary domains={progress.domains} />}

        {/* Random Tip */}
        <TipCard initialTips={initialTips} allTips={allTips} />
      </div>
    </div>
  );
}
