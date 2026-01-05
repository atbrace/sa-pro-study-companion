import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 lg:p-24">
      <div className="max-w-5xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            AWS Solutions Architect Professional
          </h1>
          <h2 className="text-2xl text-muted-foreground">
            Study Companion (SAP-C02)
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your comprehensive certification preparation tool featuring adaptive assessments,
            AI-powered tutoring, and hands-on AWS experiments.
          </p>
        </div>

        <Separator />

        {/* Feature Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Driven</CardTitle>
              <CardDescription>
                Identify weak areas with adaptive quizzes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Domain 1</span>
                  <span className="font-medium">26%</span>
                </div>
                <Progress value={26} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI Tutor</CardTitle>
              <CardDescription>
                Context-aware help powered by Claude
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">Always Available</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hands-on Labs</CardTitle>
              <CardDescription>
                Real AWS resources via CDK
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="outline">8-12 Experiments</Badge>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Exam Domains */}
        <div>
          <h3 className="text-2xl font-semibold mb-4">SAP-C02 Exam Domains</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Domain 1</CardTitle>
                  <Badge>26%</Badge>
                </div>
                <CardDescription>
                  Design Solutions for Organizational Complexity
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Domain 2</CardTitle>
                  <Badge>29%</Badge>
                </div>
                <CardDescription>
                  Design for New Solutions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-l-4 border-l-amber-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Domain 3</CardTitle>
                  <Badge>25%</Badge>
                </div>
                <CardDescription>
                  Continuous Improvement for Existing Solutions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Domain 4</CardTitle>
                  <Badge>20%</Badge>
                </div>
                <CardDescription>
                  Accelerate Workload Migration and Modernization
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center pt-8">
          <Button size="lg">Get Started</Button>
          <Button size="lg" variant="outline">View Documentation</Button>
        </div>
      </div>
    </main>
  );
}
