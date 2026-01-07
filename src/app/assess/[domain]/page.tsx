'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QuestionCard } from '@/components/assess/QuestionCard';
import { Clock, CheckCircle, XCircle, Target, TrendingUp } from 'lucide-react';
import type { Question } from '@/types/domain';
import type { QuestionAnswer, AssessmentResult } from '@/types/assessment';

interface AssessmentPageProps {
  params: { domain: string };
  searchParams: { topic?: string };
}

export default function AssessmentPage({ params, searchParams }: AssessmentPageProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load questions (in a real app, this would fetch from an API)
  useEffect(() => {
    // For demo purposes, we'll fetch questions client-side
    // In production, this should be server-side
    fetch(`/api/questions?domain=${params.domain}${searchParams.topic ? `&topic=${searchParams.topic}` : ''}`)
      .then(res => res.json())
      .then(data => setQuestions(data.questions || []))
      .catch(err => console.error('Failed to load questions:', err));
  }, [params.domain, searchParams.topic]);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;

  const handleAnswer = (answer: string | string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answer);
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Build answers array with timing
    const answerArray: QuestionAnswer[] = [];
    const now = Date.now();

    for (const question of questions) {
      const answer = answers.get(question.id);
      if (answer !== undefined) {
        answerArray.push({
          questionId: question.id,
          selectedAnswer: answer,
          timeSeconds: Math.floor((now - startTime) / 1000 / questions.length), // Average time per question
        });
      }
    }

    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `session-${Date.now()}`,
          domainId: params.domain,
          topicId: searchParams.topic,
          answers: answerArray,
          mode: 'relaxed' as const,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit assessment');
      }

      const data: AssessmentResult = await response.json();
      setResult(data);
      setShowResults(true);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to submit assessment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Loading questions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results view
  if (showResults && result) {
    return (
      <div className="container py-8 max-w-4xl">
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">Assessment Complete!</CardTitle>
            <CardDescription>
              Here's how you performed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{result.score}%</div>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    {result.correctCount} correct
                  </span>
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-red-600" />
                    {result.totalCount - result.correctCount} incorrect
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {Math.floor(result.timeSeconds / 60)}m {result.timeSeconds % 60}s
                  </span>
                </div>
              </div>

              <ProgressIndicator value={result.score} className="h-3 w-full max-w-md" />

              <Badge variant={result.score >= 85 ? 'default' : result.score >= 60 ? 'secondary' : 'destructive'} className="text-base px-4 py-2">
                {result.score >= 85 ? 'Excellent!' : result.score >= 60 ? 'Good Progress' : 'Needs Review'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Question Review */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
            <CardDescription>
              Review your answers and explanations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.results.map((questionResult, idx) => (
                <div key={questionResult.questionId} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    {questionResult.isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">Question {idx + 1}</Badge>
                        {questionResult.isCorrect ? (
                          <Badge className="bg-green-600">Correct</Badge>
                        ) : (
                          <Badge variant="destructive">Incorrect</Badge>
                        )}
                      </div>
                      <p className="text-sm mb-2">{questionResult.question.text}</p>
                      {!questionResult.isCorrect && (
                        <div className="text-sm space-y-1 mb-2">
                          <p className="text-muted-foreground">
                            <span className="font-medium">Your answer:</span>{' '}
                            {Array.isArray(questionResult.selectedAnswer)
                              ? questionResult.selectedAnswer.join(', ')
                              : questionResult.selectedAnswer}
                          </p>
                          <p className="text-green-700 dark:text-green-400">
                            <span className="font-medium">Correct answer:</span>{' '}
                            {Array.isArray(questionResult.correctAnswer)
                              ? questionResult.correctAnswer.join(', ')
                              : questionResult.correctAnswer}
                          </p>
                        </div>
                      )}
                      <div className="mt-3 p-3 bg-muted/50 rounded-md">
                        <p className="text-sm font-medium mb-1">Explanation:</p>
                        <p className="text-sm text-muted-foreground">{questionResult.explanation}</p>
                        {questionResult.awsDocLink && (
                          <a
                            href={questionResult.awsDocLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-2"
                          >
                            Learn more in AWS documentation →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {result.weakAreas.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Areas to Review
              </CardTitle>
              <CardDescription>
                Focus on these topics to improve your score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.weakAreas.map((area, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{area.topicName}</p>
                      <p className="text-sm text-muted-foreground">
                        {area.incorrectCount} incorrect answer{area.incorrectCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/study/${params.domain}`}>Review</a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button onClick={() => router.push('/assess')}>Back to Assessments</Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Retake Assessment
          </Button>
        </div>
      </div>
    );
  }

  // Assessment view
  return (
    <div className="container py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Assessment</h1>
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            {Math.floor((Date.now() - startTime) / 1000 / 60)}m
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground mt-2">
          Question {currentIndex + 1} of {questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="mb-6">
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={questions.length}
          onAnswer={handleAnswer}
          userAnswer={answers.get(currentQuestion.id)}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          Previous
        </Button>

        <div className="text-sm text-muted-foreground">
          {answers.size} of {questions.length} answered
        </div>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || answers.size !== questions.length}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Assessment'}
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
