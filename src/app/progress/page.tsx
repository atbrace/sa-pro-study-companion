import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, BookOpen, Target } from "lucide-react";

export default function ProgressPage() {
  return (
    <div className="container py-8">
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
            <div className="text-2xl font-bold">0%</div>
            <Progress value={0} className="mt-2 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Target: 85%+
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Questions Attempted</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">
              0 correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0h</div>
            <p className="text-xs text-muted-foreground mt-1">
              This week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exam Readiness</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <Badge variant="outline" className="mt-2">Not Ready</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Domain Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progress by Domain</CardTitle>
          <CardDescription>
            Your mastery level for each SAP-C02 exam domain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { name: 'Design Solutions for Organizational Complexity', weight: 26, color: 'blue' },
            { name: 'Design for New Solutions', weight: 29, color: 'green' },
            { name: 'Continuous Improvement for Existing Solutions', weight: 25, color: 'amber' },
            { name: 'Accelerate Workload Migration and Modernization', weight: 20, color: 'purple' },
          ].map((domain, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{domain.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">0%</span>
                  <Badge variant="outline">{domain.weight}%</Badge>
                </div>
              </div>
              <Progress value={0} className="h-2" />
              <p className="text-xs text-muted-foreground">
                0 topics completed • 0 questions attempted
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
