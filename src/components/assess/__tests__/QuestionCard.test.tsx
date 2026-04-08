import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuestionCard } from '../QuestionCard';
import type { Question } from '@/types/domain';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildSingleQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-single-001',
    type: 'single',
    text: 'Which AWS service provides a managed relational database?',
    options: [
      { id: 'A', text: 'Amazon DynamoDB' },
      { id: 'B', text: 'Amazon RDS' },
      { id: 'C', text: 'Amazon S3' },
      { id: 'D', text: 'Amazon Redshift' },
    ],
    correctAnswer: 'B',
    explanation: 'Amazon RDS is the managed relational database service.',
    services: ['Amazon RDS'],
    concepts: ['databases'],
    ...overrides,
  };
}

function buildMultiQuestion(overrides: Partial<Question> = {}): Question {
  return {
    id: 'q-multi-001',
    type: 'multi',
    correctCount: 2,
    text: 'Which two services provide object storage on AWS?',
    options: [
      { id: 'A', text: 'Amazon S3' },
      { id: 'B', text: 'Amazon EBS' },
      { id: 'C', text: 'Amazon Glacier' },
      { id: 'D', text: 'Amazon EC2' },
    ],
    correctAnswer: ['A', 'C'],
    explanation: 'S3 and Glacier both provide object storage.',
    services: ['Amazon S3', 'Amazon Glacier'],
    concepts: ['storage'],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QuestionCard', () => {
  let onAnswer: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onAnswer = vi.fn();
  });

  // 1. Renders question text and all options
  it('renders the question text and all option labels', () => {
    const question = buildSingleQuestion();
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        totalQuestions={10}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText(question.text)).toBeInTheDocument();
    for (const option of question.options) {
      expect(screen.getByText(option.text)).toBeInTheDocument();
    }
  });

  // 2. Shows "Question N of M" badge
  it('renders the question number badge', () => {
    render(
      <QuestionCard
        question={buildSingleQuestion()}
        questionNumber={3}
        totalQuestions={15}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText('Question 3 of 15')).toBeInTheDocument();
  });

  // 3. Single-select: clicking an option calls onAnswer with the option id
  it('calls onAnswer with option id on single-select click', async () => {
    const user = userEvent.setup();
    render(
      <QuestionCard
        question={buildSingleQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
      />
    );

    const radioB = screen.getByRole('radio', { name: /B\.\s*Amazon RDS/ });
    await user.click(radioB);

    expect(onAnswer).toHaveBeenCalledOnce();
    expect(onAnswer).toHaveBeenCalledWith('B');
  });

  // 4a. Multi-select: shows "Select N answers" badge
  it('renders "Select N answers" badge for multi-select questions', () => {
    render(
      <QuestionCard
        question={buildMultiQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
      />
    );

    expect(screen.getByText(/select 2 answers/i)).toBeInTheDocument();
  });

  // 4b. Multi-select: toggling checkboxes calls onAnswer with accumulated array
  it('accumulates selections and calls onAnswer with array on multi-select', async () => {
    const user = userEvent.setup();
    render(
      <QuestionCard
        question={buildMultiQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
      />
    );

    const checkboxA = screen.getByRole('checkbox', { name: /A\.\s*Amazon S3/ });
    const checkboxC = screen.getByRole('checkbox', { name: /C\.\s*Amazon Glacier/ });

    await user.click(checkboxA);
    expect(onAnswer).toHaveBeenLastCalledWith(['A']);

    await user.click(checkboxC);
    expect(onAnswer).toHaveBeenLastCalledWith(['A', 'C']);

    // Deselecting A removes it from the array
    await user.click(checkboxA);
    expect(onAnswer).toHaveBeenLastCalledWith(['C']);
  });

  // 5a. showResult=true with correct answer shows "Correct!" banner and explanation
  it('shows "Correct!" banner and explanation when showResult is true and answer is correct', () => {
    const question = buildSingleQuestion();
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
        showResult
        userAnswer="B"
      />
    );

    expect(screen.getByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText(question.explanation)).toBeInTheDocument();
  });

  // 5b. showResult=true with wrong answer shows "Incorrect" banner
  it('shows "Incorrect" banner when showResult is true and answer is wrong', () => {
    render(
      <QuestionCard
        question={buildSingleQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
        showResult
        userAnswer="A"
      />
    );

    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  // 6. showResult=true with awsDocLink renders AWS doc link
  it('renders the AWS documentation link when showResult is true and awsDocLink is present', () => {
    const question = buildSingleQuestion({
      awsDocLink: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html',
    });
    render(
      <QuestionCard
        question={question}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
        showResult
        userAnswer="B"
      />
    );

    const link = screen.getByRole('link', { name: /learn more in aws documentation/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', question.awsDocLink);
    expect(link).toHaveAttribute('target', '_blank');
  });

  // 7. disabled=true: clicking options does NOT call onAnswer
  it('does not call onAnswer when disabled', async () => {
    const user = userEvent.setup();
    render(
      <QuestionCard
        question={buildSingleQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
        disabled
      />
    );

    const radioA = screen.getByRole('radio', { name: /A\.\s*Amazon DynamoDB/ });
    await user.click(radioA);

    expect(onAnswer).not.toHaveBeenCalled();
  });

  // 8. userAnswer prop syncs selected state (radio is checked)
  it('pre-selects the option matching userAnswer for single-select', () => {
    render(
      <QuestionCard
        question={buildSingleQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
        userAnswer="C"
      />
    );

    const radioC = screen.getByRole('radio', { name: /C\.\s*Amazon S3/ });
    expect(radioC).toBeChecked();
  });

  // 9. userAnswer prop syncs multi-select checkboxes
  it('pre-checks the options matching userAnswer for multi-select', () => {
    render(
      <QuestionCard
        question={buildMultiQuestion()}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
        userAnswer={['A', 'C']}
      />
    );

    expect(screen.getByRole('checkbox', { name: /A\.\s*Amazon S3/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /C\.\s*Amazon Glacier/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /B\.\s*Amazon EBS/ })).not.toBeChecked();
  });

  // 10. AWS doc link is NOT rendered when showResult is false
  it('does not render the AWS doc link when showResult is false', () => {
    render(
      <QuestionCard
        question={buildSingleQuestion({ awsDocLink: 'https://docs.aws.amazon.com/' })}
        questionNumber={1}
        totalQuestions={5}
        onAnswer={onAnswer}
      />
    );

    expect(screen.queryByRole('link', { name: /learn more in aws documentation/i })).not.toBeInTheDocument();
  });
});
