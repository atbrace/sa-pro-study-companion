import { Construction } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getProgressSummary } from "@/lib/progress/calculator";
import { getTipsForState, getAllTipsArray } from "@/lib/dashboard/tips";
import { getContentStats } from "@/lib/content/loader";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DomainProgressGrid } from "@/components/dashboard/DomainProgressGrid";
import { WeakAreasSummary } from "@/components/dashboard/WeakAreasSummary";
import { TipCard } from "@/components/dashboard/TipCard";

interface DashboardPageProps {
  params: Promise<{ exam: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { exam: examId } = await params;
  const progress = getProgressSummary(examId);
  const contentStats = getContentStats(examId);
  const isNewUser = progress.overall.questionsAttempted === 0;
  const isContentIncomplete = contentStats.totalQuestions < 50;

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
        {/* Under Construction Banner */}
        {isContentIncomplete && (
          <Alert>
            <Construction className="h-4 w-4" />
            <AlertTitle>Content Under Construction</AlertTitle>
            <AlertDescription>
              Study content for this exam is currently being developed. Check back soon for questions and detailed topic guides.
            </AlertDescription>
          </Alert>
        )}

        {/* Hero Section with mastery score and adaptive CTA */}
        <DashboardHero overall={progress.overall} domains={progress.domains} examId={examId} />

        <Separator />

        {/* Domain Progress Grid */}
        <DomainProgressGrid domains={progress.domains} isNewUser={isNewUser} examId={examId} />

        {/* Weak Areas Summary - only shown if user has weak areas */}
        {!isNewUser && <WeakAreasSummary domains={progress.domains} examId={examId} />}

        {/* Random Tip */}
        <TipCard initialTips={initialTips} allTips={allTips} />
      </div>
    </div>
  );
}
