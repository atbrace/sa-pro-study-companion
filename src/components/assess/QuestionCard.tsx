'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import type { Question } from '@/types/domain';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (answer: string | string[]) => void;
  showResult?: boolean;
  userAnswer?: string | string[];
  disabled?: boolean;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  showResult = false,
  userAnswer,
  disabled = false,
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | string[]>(
    userAnswer || (question.type === 'multi' ? [] : '')
  );

  useEffect(() => {
    // Reset state when question changes or userAnswer changes
    if (userAnswer !== undefined) {
      setSelected(userAnswer);
    } else {
      // Clear selection for new question
      setSelected(question.type === 'multi' ? [] : '');
    }
  }, [userAnswer, question.id, question.type]);

  const handleSingleSelect = (value: string) => {
    if (disabled) return;
    setSelected(value);
    onAnswer(value);
  };

  const handleMultiSelect = (optionId: string, checked: boolean) => {
    if (disabled) return;
    const currentSelected = Array.isArray(selected) ? selected : [];
    const newSelected = checked
      ? [...currentSelected, optionId]
      : currentSelected.filter(id => id !== optionId);

    setSelected(newSelected);
    onAnswer(newSelected);
  };

  const isOptionCorrect = (optionId: string) => {
    if (!showResult) return false;
    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.includes(optionId);
    }
    return question.correctAnswer === optionId;
  };

  const isOptionSelected = (optionId: string) => {
    if (Array.isArray(selected)) {
      return selected.includes(optionId);
    }
    return selected === optionId;
  };

  const isAnswerCorrect = () => {
    if (Array.isArray(question.correctAnswer) && Array.isArray(selected)) {
      return (
        question.correctAnswer.length === selected.length &&
        question.correctAnswer.every(ans => selected.includes(ans))
      );
    }
    return question.correctAnswer === selected;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <Badge variant="outline">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          {question.type === 'multi' && (
            <Badge variant="secondary">
              <Info className="h-3 w-3 mr-1" />
              Select {question.correctCount} answers
            </Badge>
          )}
        </div>
        <p className="text-lg leading-relaxed">{question.text}</p>
      </CardHeader>
      <CardContent>
        {question.type === 'single' ? (
          <RadioGroup
            value={typeof selected === 'string' ? selected : ''}
            onValueChange={handleSingleSelect}
            disabled={disabled}
          >
            <div className="space-y-3">
              {question.options.map((option) => {
                const correct = isOptionCorrect(option.id);
                const selectedOption = isOptionSelected(option.id);

                return (
                  <div
                    key={option.id}
                    className={cn(
                      'flex items-start space-x-3 p-4 rounded-lg border transition-colors',
                      !showResult && selectedOption && 'border-primary bg-primary/5',
                      !showResult && !selectedOption && 'hover:bg-muted/50',
                      showResult && correct && 'border-green-500 bg-green-50 dark:bg-green-950',
                      showResult && selectedOption && !correct && 'border-red-500 bg-red-50 dark:bg-red-950'
                    )}
                  >
                    <RadioGroupItem
                      value={option.id}
                      id={`${question.id}-${option.id}`}
                      disabled={disabled}
                      className="mt-0.5"
                    />
                    <Label
                      htmlFor={`${question.id}-${option.id}`}
                      className="flex-1 cursor-pointer leading-relaxed"
                    >
                      <span className="font-medium mr-2">{option.id}.</span>
                      {option.text}
                    </Label>
                    {showResult && correct && (
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    )}
                    {showResult && selectedOption && !correct && (
                      <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </RadioGroup>
        ) : (
          <div className="space-y-3">
            {question.options.map((option) => {
              const correct = isOptionCorrect(option.id);
              const selectedOption = isOptionSelected(option.id);

              return (
                <div
                  key={option.id}
                  className={cn(
                    'flex items-start space-x-3 p-4 rounded-lg border transition-colors',
                    !showResult && selectedOption && 'border-primary bg-primary/5',
                    !showResult && !selectedOption && 'hover:bg-muted/50',
                    showResult && correct && 'border-green-500 bg-green-50 dark:bg-green-950',
                    showResult && selectedOption && !correct && 'border-red-500 bg-red-50 dark:bg-red-950'
                  )}
                >
                  <Checkbox
                    id={`${question.id}-${option.id}`}
                    checked={selectedOption}
                    onCheckedChange={(checked) => handleMultiSelect(option.id, checked as boolean)}
                    disabled={disabled}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`${question.id}-${option.id}`}
                    className="flex-1 cursor-pointer leading-relaxed"
                  >
                    <span className="font-medium mr-2">{option.id}.</span>
                    {option.text}
                  </Label>
                  {showResult && correct && (
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  )}
                  {showResult && selectedOption && !correct && (
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Explanation (shown after answer) */}
        {showResult && (
          <div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center gap-2">
              {isAnswerCorrect() ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-700 dark:text-green-400">Correct!</span>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-700 dark:text-red-400">Incorrect</span>
                </>
              )}
            </div>
            <div className="text-sm">
              <p className="font-medium mb-2">Explanation:</p>
              <p className="text-muted-foreground leading-relaxed">{question.explanation}</p>
            </div>
            {question.awsDocLink && (
              <div className="pt-2 border-t">
                <a
                  href={question.awsDocLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Learn more in AWS documentation →
                </a>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
