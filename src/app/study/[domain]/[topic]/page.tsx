import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Clock, Target, ExternalLink, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { getDomainById, getTopicById } from "@/lib/content/loader";
import ReactMarkdown from "react-markdown";

interface PageProps {
  params: Promise<{ domain: string; topic: string }>;
}

export default async function TopicPage({ params }: PageProps) {
  const { domain: domainId, topic: topicId } = await params;

  const domain = getDomainById(domainId);
  if (!domain) {
    notFound();
  }

  const topic = getTopicById(domainId, topicId);
  if (!topic) {
    notFound();
  }

  // Find previous and next topics for navigation
  const topicIndex = domain.topics.findIndex(t => t.meta.id === topicId);
  const prevTopic = topicIndex > 0 ? domain.topics[topicIndex - 1] : null;
  const nextTopic = topicIndex < domain.topics.length - 1 ? domain.topics[topicIndex + 1] : null;

  return (
    <div className="container py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/study" className="hover:text-foreground">
          Study
        </Link>
        <span>/</span>
        <Link href={`/study/${domainId}`} className="hover:text-foreground">
          {domain.meta.shortName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{topic.meta.shortName}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="capitalize">{topic.meta.difficulty}</Badge>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            ~{topic.meta.estimatedStudyTime} min
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {topic.meta.name}
        </h1>
        <p className="text-muted-foreground">{topic.meta.description}</p>
      </div>

      {/* Key Information */}
      <div className="grid gap-4 md:grid-cols-2 mb-8">
        {/* Key Services */}
        {topic.meta.keyServices && topic.meta.keyServices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Services</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topic.meta.keyServices.map((service) => (
                  <Badge key={service} variant="secondary">{service}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Key Concepts */}
        {topic.meta.keyConcepts && topic.meta.keyConcepts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Key Concepts</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {topic.meta.keyConcepts.map((concept) => (
                  <li key={concept}>{concept}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Practice Questions Callout */}
      {topic.questions.length > 0 && (
        <Card className="mb-8 border-primary/50 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Practice Questions</CardTitle>
                <CardDescription>
                  Test your knowledge with {topic.questions.length} practice question{topic.questions.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button variant="default" size="sm" asChild>
                <Link href={`/assess?domain=${domainId}&topic=${topicId}`}>
                  <Target className="mr-2 h-4 w-4" />
                  Start Quiz
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      )}

      <Separator className="my-8" />

      {/* Content */}
      {topic.content ? (
        <div className="prose prose-sm lg:prose-base dark:prose-invert max-w-none mb-8">
          <ReactMarkdown>{topic.content.content}</ReactMarkdown>
        </div>
      ) : (
        <Card className="mb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Content for this topic is being prepared.</p>
          </CardContent>
        </Card>
      )}

      <Separator className="my-8" />

      {/* AWS Documentation Links */}
      {topic.meta.awsDocLinks && topic.meta.awsDocLinks.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>AWS Documentation</CardTitle>
            <CardDescription>
              Official AWS resources for this topic
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topic.meta.awsDocLinks.map((link, idx) => (
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
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Experiments */}
      {topic.meta.relatedExperiments && topic.meta.relatedExperiments.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Related Hands-on Labs</CardTitle>
            <CardDescription>
              Practice these concepts with real AWS resources
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topic.meta.relatedExperiments.map((labId) => (
                <div
                  key={labId}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <p className="font-medium text-sm">{labId}</p>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-8 border-t">
        {prevTopic ? (
          <Button variant="outline" asChild>
            <Link href={`/study/${domainId}/${prevTopic.meta.id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {prevTopic.meta.shortName}
            </Link>
          </Button>
        ) : (
          <div />
        )}

        <Button variant="outline" asChild>
          <Link href={`/study/${domainId}`}>
            Back to Domain
          </Link>
        </Button>

        {nextTopic ? (
          <Button variant="outline" asChild>
            <Link href={`/study/${domainId}/${nextTopic.meta.id}`}>
              {nextTopic.meta.shortName}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
