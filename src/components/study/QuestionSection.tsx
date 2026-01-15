import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target } from 'lucide-react';
import type { Topic } from '@/types/domain';

interface QuestionSectionProps {
  topic: Topic;
  examId: string;
  examName: string;
  domainId: string;
  topicId: string;
}

export function QuestionSection({ topic, examId, examName, domainId, topicId }: QuestionSectionProps) {
  const questionCount = topic.questions.length;

  return (
    <div className="space-y-6">
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle>Practice Questions</CardTitle>
          <CardDescription>
            Test your knowledge with {questionCount} practice question{questionCount !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-6">
            Ready to test what you've learned? These questions cover all concepts from this topic and will help you prepare for the {examName} exam.
          </p>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={`/${examId}/assess/${domainId}?topic=${topicId}`}>
              <Target className="mr-2 h-5 w-5" />
              Start Practice Quiz ({questionCount} questions)
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About These Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            These practice questions are designed to test your understanding of key concepts and help you identify areas that need more study.
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Questions are based on real {examName} exam patterns</li>
            <li>Each question includes detailed explanations</li>
            <li>Links to official AWS documentation for further reading</li>
            <li>Track your progress and identify weak areas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
