'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { QuestionCard } from '@/components/assess/QuestionCard';
import { Clock, CheckCircle, XCircle, Target } from 'lucide-react';
import type { Question } from '@/types/domain';
import { MASTERY_THRESHOLD, APPROACHING_THRESHOLD } from '@/lib/constants';
import type { QuestionAnswer, AssessmentResult } from '@/types/assessment';

interface AssessmentClientProps {
  examId: string;
  domainId: string;
  topicId?: string;
  questions: Question[];
}

export function AssessmentClient({ examId, domainId, topicId, questions }: AssessmentClientProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string | string[]>>(new Map());
  const [startTime] = useState(Date.now());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [questionTimes, setQuestionTimes] = useState<Map<string, number>>(new Map());
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;

  // Record time spent on current question before leaving it
  const recordCurrentQuestionTime = () => {
    if (!currentQuestion) return;
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const existing = questionTimes.get(currentQuestion.id) || 0;
    const newTimes = new Map(questionTimes);
    newTimes.set(currentQuestion.id, existing + elapsed);
    setQuestionTimes(newTimes);
  };

  const handleAnswer = (answer: string | string[]) => {
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion.id, answer);
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      recordCurrentQuestionTime();
      setCurrentIndex(currentIndex + 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      recordCurrentQuestionTime();
      setCurrentIndex(currentIndex - 1);
      setQuestionStartTime(Date.now());
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    // Record time for the current (final) question before submitting
    const finalElapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const finalTimes = new Map(questionTimes);
    if (currentQuestion) {
      const existing = finalTimes.get(currentQuestion.id) || 0;
      finalTimes.set(currentQuestion.id, existing + finalElapsed);
    }

    // Build answers array with individual question timing
    const answerArray: QuestionAnswer[] = [];

    for (const question of questions) {
      const answer = answers.get(question.id);
      if (answer !== undefined) {
        answerArray.push({
          questionId: question.id,
          selectedAnswer: answer,
          timeSeconds: finalTimes.get(question.id) || 0,
        });
      }
    }

    try {
      const response = await fetch('/api/assess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: `session-${Date.now()}`,
          examId,
          domainId,
          topicId,
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

              <Badge variant={result.score >= MASTERY_THRESHOLD ? 'default' : result.score >= APPROACHING_THRESHOLD ? 'secondary' : 'destructive'} className="text-base px-4 py-2">
                {result.score >= MASTERY_THRESHOLD ? 'Excellent!' : result.score >= APPROACHING_THRESHOLD ? 'Good Progress' : 'Needs Review'}
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
                        <div className="text-sm space-y-2 mb-2">
                          <div className="text-muted-foreground">
                            <p className="font-medium mb-1">Your answer:</p>
                            {Array.isArray(questionResult.selectedAnswer) ? (
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                {questionResult.selectedAnswer.map((answerId) => {
                                  const option = questionResult.question.options.find(opt => opt.id === answerId);
                                  return option ? (
                                    <li key={answerId}>
                                      <span className="font-medium">{option.id}.</span> {option.text}
                                    </li>
                                  ) : null;
                                })}
                              </ul>
                            ) : (
                              <p className="ml-2">
                                {(() => {
                                  const option = questionResult.question.options.find(
                                    opt => opt.id === questionResult.selectedAnswer
                                  );
                                  return option ? (
                                    <>
                                      <span className="font-medium">{option.id}.</span> {option.text}
                                    </>
                                  ) : questionResult.selectedAnswer;
                                })()}
                              </p>
                            )}
                          </div>
                          <div className="text-green-700 dark:text-green-400">
                            <p className="font-medium mb-1">Correct answer:</p>
                            {Array.isArray(questionResult.correctAnswer) ? (
                              <ul className="list-disc list-inside space-y-0.5 ml-2">
                                {questionResult.correctAnswer.map((answerId) => {
                                  const option = questionResult.question.options.find(opt => opt.id === answerId);
                                  return option ? (
                                    <li key={answerId}>
                                      <span className="font-medium">{option.id}.</span> {option.text}
                                    </li>
                                  ) : null;
                                })}
                              </ul>
                            ) : (
                              <p className="ml-2">
                                {(() => {
                                  const option = questionResult.question.options.find(
                                    opt => opt.id === questionResult.correctAnswer
                                  );
                                  return option ? (
                                    <>
                                      <span className="font-medium">{option.id}.</span> {option.text}
                                    </>
                                  ) : questionResult.correctAnswer;
                                })()}
                              </p>
                            )}
                          </div>
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
              <div className="space-y-4">
                {result.weakAreas.map((area) => (
                  <div key={area.topicId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{area.topicName}</p>
                        <p className="text-sm text-muted-foreground">
                          {area.incorrectCount} incorrect answer{area.incorrectCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={`/${examId}/study/${area.domainId}/${area.topicId}`}>Review Topic</a>
                      </Button>
                    </div>

                    {/* Missed questions list */}
                    {area.missedQuestions && area.missedQuestions.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Missed Questions:
                        </p>
                        <div className="space-y-2">
                          {area.missedQuestions.map((q) => (
                            <div
                              key={q.id}
                              className="pl-3 border-l-2 border-red-200 text-sm text-muted-foreground"
                            >
                              {q.text.length > 150 ? `${q.text.substring(0, 150)}...` : q.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button onClick={() => router.push(`/${examId}/assess`)}>Back to Assessments</Button>
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
