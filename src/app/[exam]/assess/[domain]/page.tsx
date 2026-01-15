import { notFound } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { getRandomDomainQuestions, getTopicQuestions, getDomainById } from '@/lib/content/loader';
import { AssessmentClient } from './AssessmentClient';

interface AssessmentPageProps {
  params: Promise<{ exam: string; domain: string }>;
  searchParams: Promise<{ topic?: string; count?: string }>;
}

export default async function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const { exam, domain } = await params;
  const { topic, count } = await searchParams;

  // Validate domain exists
  const domainData = getDomainById(exam, domain);
  if (!domainData) {
    notFound();
  }

  // Fetch questions server-side (eliminates client-side waterfall)
  const questionCount = count ? parseInt(count, 10) : 15;
  const questions = topic
    ? getTopicQuestions(exam, domain, topic)
    : getRandomDomainQuestions(exam, domain, questionCount);

  if (questions.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No questions available for this {topic ? 'topic' : 'domain'}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AssessmentClient
      examId={exam}
      domainId={domain}
      topicId={topic}
      questions={questions}
    />
  );
}
