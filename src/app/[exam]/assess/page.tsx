import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, Target, ArrowRight } from "lucide-react";
import { getAllDomains, getDomainQuestionCount } from "@/lib/content/loader";
import { getExamById } from "@/lib/content/exam-loader";
import { db } from "@/lib/db/client";
import { getDomainBorderColor } from "@/lib/utils/domain-colors";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ exam: string }>;
}

export default async function AssessPage({ params }: PageProps) {
  const { exam: examId } = await params;
  const domains = getAllDomains(examId);
  const examConfig = getExamById(examId);
  const examName = examConfig?.shortName || examId.toUpperCase();
  const masteryThreshold = examConfig?.masteryThreshold || 85;

  // Get stats from database for this exam
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_attempts,
      AVG(score_percentage) as avg_score
    FROM assessment_sessions
    WHERE exam_id = ?
  `).get(examId) as { total_attempts: number; avg_score: number | null };

  const questionAttempts = db.prepare(`
    SELECT COUNT(*) as count FROM question_attempts
    WHERE exam_id = ?
  `).get(examId) as { count: number };

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Assessments</h1>
        <p className="text-muted-foreground">
          Test your knowledge with adaptive quizzes and identify areas for improvement
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Attempted</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{questionAttempts.count}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all domains
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avg_score ? `${Math.round(stats.avg_score)}%` : '-'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Target: {masteryThreshold}%+
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments Taken</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_attempts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total sessions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Domain Assessments</CardTitle>
          <CardDescription>
            Test your knowledge for each {examName} domain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {domains.map((domain) => {
              const questionCount = getDomainQuestionCount(domain);

              return (
                <div
                  key={domain.meta.id}
                  className={cn(
                    "flex items-center justify-between p-4 border-l-4 rounded-lg hover:bg-muted/50 transition-colors",
                    getDomainBorderColor(domain.meta.color)
                  )}
                >
                  <div>
                    <p className="font-medium">{domain.meta.shortName}</p>
                    <p className="text-sm text-muted-foreground">
                      {questionCount} question{questionCount !== 1 ? 's' : ''} • {domain.meta.weight}% exam weight
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${examId}/assess/${domain.meta.id}`}>
                      Start
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Full Practice Exam</CardTitle>
          <CardDescription>
            Take a complete practice exam with questions from all domains
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">{examName} Practice Exam</p>
              <p className="text-sm text-muted-foreground">75 questions - ~150 min - Timed</p>
            </div>
            <Badge variant="secondary">Coming Soon</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
