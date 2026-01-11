import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressIndicator } from "@/components/ui/progress-indicator";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, BookOpen, Target, Clock } from "lucide-react";
import { DomainRadarChart, DomainBarChart } from "@/components/progress/DomainChart";
import { WeakAreasList } from "@/components/progress/WeakAreasList";
import { StudyStreak } from "@/components/progress/StudyStreak";
import { getProgressSummary } from "@/lib/progress/calculator";
import { getExamById } from "@/lib/content/exam-loader";

interface PageProps {
  params: Promise<{ exam: string }>;
}

export default async function ProgressPage({ params }: PageProps) {
  const { exam: examId } = await params;
  const progress = getProgressSummary(examId);
  const examConfig = getExamById(examId);
  const examName = examConfig?.shortName || examId.toUpperCase();
  const masteryThreshold = examConfig?.masteryThreshold || 85;

  const formatStudyTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getReadinessBadge = () => {
    const { confidence, score } = progress.readinessEstimate;

    if (confidence === 'high') {
      return <Badge className="bg-green-500">Ready ({score})</Badge>;
    } else if (confidence === 'medium') {
      return <Badge className="bg-amber-500">Preparing ({score})</Badge>;
    } else {
      return <Badge variant="outline">Not Ready</Badge>;
    }
  };

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Your Progress</h1>
        <p className="text-muted-foreground">
          Track your study progress and exam readiness across all domains
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Mastery</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(progress.overall.masteryScore)}%
            </div>
            <ProgressIndicator value={progress.overall.masteryScore} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Target: {masteryThreshold}%+
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Attempted</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.overall.questionsAttempted}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {progress.overall.questionsCorrect} correct (
              {progress.overall.questionsAttempted > 0
                ? Math.round((progress.overall.questionsCorrect / progress.overall.questionsAttempted) * 100)
                : 0}
              %)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatStudyTime(progress.overall.studyTimeMinutes)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total study time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exam Readiness</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress.readinessEstimate.score > 0 ? progress.readinessEstimate.score : '-'}
            </div>
            <div className="mt-2">
              {getReadinessBadge()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Readiness Recommendation */}
      {progress.readinessEstimate.score > 0 && (
        <Card className="mb-8 border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Exam Readiness Assessment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{progress.readinessEstimate.recommendation}</p>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <DomainRadarChart domains={progress.domains} />
        <DomainBarChart domains={progress.domains} />
      </div>

      {/* Domain Progress Details */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Progress by Domain</CardTitle>
          <CardDescription>
            Your mastery level for each {examName} exam domain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {progress.domains.map((domain) => (
            <div key={domain.domainId} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{domain.domainName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {Math.round(domain.masteryScore)}%
                  </span>
                  <Badge variant="outline">{domain.weight}%</Badge>
                </div>
              </div>
              <ProgressIndicator value={domain.masteryScore} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {domain.topicsCompleted}/{domain.totalTopics} topics completed •
                {' '}{domain.questionsAttempted} questions attempted
                {domain.questionsAttempted > 0 && (
                  <> • {Math.round((domain.questionsCorrect / domain.questionsAttempted) * 100)}% accuracy</>
                )}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weak Areas and Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WeakAreasList domains={progress.domains} examId={examId} />
        <StudyStreak
          recentActivity={progress.recentActivity}
          studyTimeMinutes={progress.overall.studyTimeMinutes}
        />
      </div>
    </div>
  );
}
