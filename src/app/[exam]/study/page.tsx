import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight } from "lucide-react";
import { getAllDomains } from "@/lib/content/loader";
import { getExamById } from "@/lib/content/exam-loader";
import { getDomainBorderColor } from "@/lib/utils/domain-colors";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ exam: string }>;
}

export default async function StudyPage({ params }: PageProps) {
  const { exam: examId } = await params;
  const domains = getAllDomains(examId);
  const examConfig = getExamById(examId);
  const examName = examConfig?.shortName || examId.toUpperCase();

  if (domains.length === 0) {
    return (
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Study Materials</h1>
          <p className="text-muted-foreground">
            Browse study content organized by {examName} exam domains
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>No Content Available</CardTitle>
            <CardDescription>
              Study content has not been added yet. Check back soon!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Study Materials</h1>
        <p className="text-muted-foreground">
          Browse study content organized by {examName} exam domains
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {domains.map((domain) => {
          const questionCount = domain.topics.reduce((sum, t) => sum + t.questions.length, 0);

          return (
            <Card key={domain.meta.id} className={cn("border-l-4", getDomainBorderColor(domain.meta.color))}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg">{domain.meta.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {domain.topics.length} topic{domain.topics.length !== 1 ? 's' : ''} • {domain.meta.weight}% exam weight
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline">{domain.meta.weight}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {domain.meta.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {questionCount} practice question{questionCount !== 1 ? 's' : ''}
                  </span>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/${examId}/study/${domain.meta.id}`}>
                      View Topics
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
