import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Clock, Target, ArrowRight, ExternalLink } from "lucide-react";
import { getDomainById } from "@/lib/content/loader";
import ReactMarkdown from "react-markdown";

interface PageProps {
  params: Promise<{ domain: string }>;
}

export default async function DomainPage({ params }: PageProps) {
  const { domain: domainId } = await params;
  const domain = getDomainById(domainId);

  if (!domain) {
    notFound();
  }

  const totalQuestions = domain.topics.reduce((sum, t) => sum + t.questions.length, 0);
  const totalStudyTime = domain.topics.reduce((sum, t) => sum + (t.meta.estimatedStudyTime || 0), 0);

  return (
    <div className="container py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/study" className="hover:text-foreground">
          Study
        </Link>
        <span>/</span>
        <span className="text-foreground">{domain.meta.shortName}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {domain.meta.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {domain.topics.length} topic{domain.topics.length !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                ~{Math.round(totalStudyTime / 60)}h study time
              </span>
            </div>
          </div>
          <Badge className="text-base px-4 py-2">{domain.meta.weight}%</Badge>
        </div>
        <p className="text-muted-foreground">{domain.meta.description}</p>
      </div>

      <Separator className="my-8" />

      {/* Domain Overview */}
      {domain.overview && (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Domain Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown>{domain.overview.content}</ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Key AWS Services */}
      {domain.meta.keyServices && domain.meta.keyServices.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Key AWS Services</CardTitle>
            <CardDescription>
              Primary AWS services you need to master for this domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {domain.meta.keyServices.map((service) => (
                <Badge key={service} variant="secondary" className="px-3 py-1.5 text-sm">
                  {service}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exam Tasks */}
      {domain.meta.examTasks && domain.meta.examTasks.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Exam Tasks</CardTitle>
            <CardDescription>
              Key areas covered in this domain according to the SAP-C02 exam guide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold w-12">#</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Task</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {domain.meta.examTasks.map((task, index) => (
                      <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-sm">{task.name}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Topics */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Topics</h2>
        <div className="grid gap-4">
          {domain.topics.map((topic) => (
            <Card key={topic.meta.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{topic.meta.name}</CardTitle>
                    <CardDescription className="mt-2">
                      {topic.meta.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {topic.meta.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      ~{topic.meta.estimatedStudyTime} min
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      {topic.questions.length} question{topic.questions.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/study/${domainId}/${topic.meta.id}`}>
                      Study Topic
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AWS Resources */}
      {domain.meta.awsDocLinks && domain.meta.awsDocLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AWS Documentation</CardTitle>
            <CardDescription>
              Official AWS resources for this domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {domain.meta.awsDocLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{link.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{link.type}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
