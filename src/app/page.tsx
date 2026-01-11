import Link from 'next/link';
import { Building2, GraduationCap, Brain, ArrowRight } from 'lucide-react';
import { getExamSummaries } from '@/lib/content/exam-loader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Building2,
  GraduationCap,
  Brain,
};

export default function ExamPickerPage() {
  const exams = getExamSummaries();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="font-semibold">AWS Study Companion</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="container py-12 lg:py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">
              Choose Your Certification
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Select an AWS certification exam to begin your study journey with AI-powered tutoring and adaptive assessments.
            </p>
          </div>

          {/* Exam Cards */}
          <div className="grid gap-4">
            {exams.map((exam) => {
              const IconComponent = iconMap[exam.icon] || Building2;

              return (
                <Link key={exam.id} href={`/${exam.id}`}>
                  <Card className="group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                    <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                      <div className={`p-3 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl">{exam.shortName}</CardTitle>
                          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </div>
                        <CardDescription className="text-base">
                          {exam.name}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {exam.description}
                      </p>
                      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{exam.domainCount} domains</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}

            {exams.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground">
                  <p>No exams available yet.</p>
                  <p className="text-sm mt-2">Add exam configurations to content/exams/ to get started.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coming Soon */}
          <div className="text-center text-sm text-muted-foreground pt-4">
            <p>More certifications coming soon</p>
          </div>
        </div>
      </main>
    </div>
  );
}
