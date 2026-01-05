# AWS SAP Study App - Development Skill

## Overview

This skill guides Claude Code in developing the AWS Solutions Architect Professional study application. It defines coding standards, patterns, and conventions specific to this project.

---

## Quick Reference

| Task | Approach |
|------|----------|
| Create new page | Use App Router conventions in `src/app/` |
| Add UI component | Use shadcn/ui, place in `src/components/ui/` |
| Add feature component | Place in `src/components/[feature]/` |
| Database query | Use better-sqlite3 sync API |
| API route | Create in `src/app/api/[endpoint]/route.ts` |
| Load content | Use content loader from `src/lib/content/` |
| Call Claude API | Use client from `src/lib/claude/` |

---

## File Conventions

### Naming

```
Components:     PascalCase.tsx          (QuestionCard.tsx)
Utilities:      camelCase.ts            (scoreCalculator.ts)
Types:          camelCase.ts            (assessment.ts)
API routes:     route.ts                (always route.ts)
Content YAML:   kebab-case.yaml         (questions.yaml)
Content MD:     kebab-case.md           (content.md)
```

### Imports Order

```typescript
// 1. React/Next
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { clsx } from 'clsx';

// 3. Internal components
import { Button } from '@/components/ui/button';
import { QuestionCard } from '@/components/assess/QuestionCard';

// 4. Internal utilities
import { calculateScore } from '@/lib/assess/scorer';

// 5. Types
import type { Question, Assessment } from '@/types/assessment';
```

---

## Component Patterns

### Page Component

```typescript
// src/app/assess/[domain]/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getDomainById } from '@/lib/content/loader';
import { AssessmentView } from '@/components/assess/AssessmentView';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';

interface PageProps {
  params: Promise<{ domain: string }>;
}

export default async function DomainAssessmentPage({ params }: PageProps) {
  const { domain } = await params;
  const domainData = await getDomainById(domain);
  
  if (!domainData) {
    notFound();
  }

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold mb-6">{domainData.name} Assessment</h1>
      <Suspense fallback={<LoadingSkeleton />}>
        <AssessmentView domain={domainData} />
      </Suspense>
    </main>
  );
}
```

### Client Component

```typescript
// src/components/assess/QuestionCard.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Question } from '@/types/assessment';

interface QuestionCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
  showResult?: boolean;
  disabled?: boolean;
}

export function QuestionCard({ 
  question, 
  onAnswer, 
  showResult = false,
  disabled = false 
}: QuestionCardProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (value: string) => {
    if (disabled) return;
    setSelected(value);
    onAnswer(value);
  };

  return (
    <Card>
      <CardHeader>
        <p className="text-lg">{question.text}</p>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selected ?? ''} onValueChange={handleSelect}>
          {question.options.map((option) => (
            <div key={option.id} className="flex items-center space-x-2">
              <RadioGroupItem 
                value={option.id} 
                id={option.id}
                disabled={disabled}
              />
              <Label htmlFor={option.id}>{option.text}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
```

### Custom Hook

```typescript
// src/hooks/useAssessment.ts
'use client';

import { useState, useCallback } from 'react';
import type { Question, AssessmentResult } from '@/types/assessment';

interface UseAssessmentOptions {
  questions: Question[];
  mode: 'timed' | 'relaxed';
  onComplete: (result: AssessmentResult) => void;
}

export function useAssessment({ questions, mode, onComplete }: UseAssessmentOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, string>>(new Map());
  const [startTime] = useState(Date.now());

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isComplete = currentIndex >= questions.length;

  const submitAnswer = useCallback((questionId: string, answer: string) => {
    setAnswers(prev => new Map(prev).set(questionId, answer));
  }, []);

  const nextQuestion = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Calculate and submit results
      const timeSeconds = Math.floor((Date.now() - startTime) / 1000);
      const result = calculateResult(questions, answers, timeSeconds);
      onComplete(result);
    }
  }, [currentIndex, questions, answers, startTime, onComplete]);

  const previousQuestion = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  return {
    currentQuestion,
    currentIndex,
    progress,
    isComplete,
    answers,
    submitAnswer,
    nextQuestion,
    previousQuestion,
  };
}
```

---

## API Route Patterns

### Standard API Route

```typescript
// src/app/api/assess/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { calculateScore } from '@/lib/assess/scorer';
import type { AssessmentSubmission, AssessmentResult } from '@/types/assessment';

export async function POST(request: NextRequest) {
  try {
    const body: AssessmentSubmission = await request.json();
    
    // Validate input
    if (!body.answers || body.answers.length === 0) {
      return NextResponse.json(
        { error: 'No answers provided' },
        { status: 400 }
      );
    }

    // Process assessment
    const result = await processAssessment(body);
    
    // Store in database
    db.prepare(`
      INSERT INTO assessment_sessions 
      (domain_id, session_type, total_questions, correct_answers, score_percentage, time_taken_seconds, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.domainId ?? null,
      'initial',
      result.totalCount,
      result.correctCount,
      result.score,
      result.timeSeconds,
      new Date(Date.now() - result.timeSeconds * 1000).toISOString()
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Assessment error:', error);
    return NextResponse.json(
      { error: 'Failed to process assessment' },
      { status: 500 }
    );
  }
}
```

### Claude API Route

```typescript
// src/app/api/tutor/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { claudeClient } from '@/lib/claude/client';
import { buildTutorPrompt } from '@/lib/claude/prompts';
import { db } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    const { message, context, conversationId } = await request.json();

    // Load conversation history if continuing
    let history: Message[] = [];
    if (conversationId) {
      const conv = db.prepare(
        'SELECT messages_json FROM tutor_conversations WHERE id = ?'
      ).get(conversationId) as { messages_json: string } | undefined;
      
      if (conv) {
        history = JSON.parse(conv.messages_json);
      }
    }

    // Build context-aware prompt
    const systemPrompt = buildTutorPrompt(context);

    // Call Claude API
    const response = await claudeClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        ...history,
        { role: 'user', content: message }
      ],
    });

    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : '';

    // Store conversation
    const newHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: assistantMessage }
    ];

    let newConversationId = conversationId;
    if (!conversationId) {
      const result = db.prepare(`
        INSERT INTO tutor_conversations 
        (context_domain, context_topic, context_question_id, messages_json)
        VALUES (?, ?, ?, ?)
      `).run(
        context.domainId ?? null,
        context.topicId ?? null,
        context.questionId ?? null,
        JSON.stringify(newHistory)
      );
      newConversationId = result.lastInsertRowid.toString();
    } else {
      db.prepare(`
        UPDATE tutor_conversations 
        SET messages_json = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(JSON.stringify(newHistory), conversationId);
    }

    return NextResponse.json({
      conversationId: newConversationId,
      response: assistantMessage,
    });
  } catch (error) {
    console.error('Tutor error:', error);
    return NextResponse.json(
      { error: 'Failed to get tutor response' },
      { status: 500 }
    );
  }
}
```

---

## Database Patterns

### Database Client Setup

```typescript
// src/lib/db/client.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_PATH || './data/study.db';

// Ensure directory exists
import fs from 'fs';
const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Run migrations on startup
import { runMigrations } from './migrations';
runMigrations(db);
```

### Query Patterns

```typescript
// src/lib/db/queries/progress.ts
import { db } from '../client';
import type { TopicProgress, DomainProgress } from '@/types/progress';

export function getTopicProgress(domainId: string, topicId: string): TopicProgress | null {
  return db.prepare(`
    SELECT * FROM topic_progress 
    WHERE domain_id = ? AND topic_id = ?
  `).get(domainId, topicId) as TopicProgress | null;
}

export function updateTopicProgress(
  domainId: string, 
  topicId: string, 
  correct: boolean
): void {
  db.prepare(`
    INSERT INTO topic_progress (domain_id, topic_id, questions_attempted, questions_correct, last_studied_at)
    VALUES (?, ?, 1, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(domain_id, topic_id) DO UPDATE SET
      questions_attempted = questions_attempted + 1,
      questions_correct = questions_correct + ?,
      mastery_level = CAST(questions_correct + ? AS REAL) / (questions_attempted + 1),
      last_studied_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  `).run(domainId, topicId, correct ? 1 : 0, correct ? 1 : 0, correct ? 1 : 0);
}

export function getDomainProgress(domainId: string): DomainProgress {
  const topics = db.prepare(`
    SELECT * FROM topic_progress WHERE domain_id = ?
  `).all(domainId) as TopicProgress[];

  const totalMastery = topics.reduce((sum, t) => sum + t.mastery_level, 0);
  const avgMastery = topics.length > 0 ? totalMastery / topics.length : 0;

  return {
    domainId,
    masteryScore: Math.round(avgMastery * 100),
    topicsStudied: topics.filter(t => t.questions_attempted > 0).length,
    totalTopics: topics.length,
  };
}
```

---

## Content Loading Patterns

### Content Loader

```typescript
// src/lib/content/loader.ts
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import type { Domain, Topic, Question } from '@/types/domain';

const CONTENT_DIR = path.join(process.cwd(), 'content/domains');

export function getAllDomains(): Domain[] {
  const domainDirs = fs.readdirSync(CONTENT_DIR);
  return domainDirs
    .filter(dir => dir.startsWith('domain-'))
    .map(dir => getDomainById(dir))
    .filter((d): d is Domain => d !== null);
}

export function getDomainById(domainId: string): Domain | null {
  const domainPath = path.join(CONTENT_DIR, domainId);
  const metaPath = path.join(domainPath, 'meta.yaml');
  
  if (!fs.existsSync(metaPath)) return null;
  
  const meta = yaml.load(fs.readFileSync(metaPath, 'utf8')) as DomainMeta;
  const topics = getTopicsForDomain(domainId);
  
  return {
    id: domainId,
    ...meta,
    topics,
  };
}

export function getTopicQuestions(domainId: string, topicId: string): Question[] {
  const questionsPath = path.join(
    CONTENT_DIR, 
    domainId, 
    'topics', 
    topicId, 
    'questions.yaml'
  );
  
  if (!fs.existsSync(questionsPath)) return [];
  
  const data = yaml.load(fs.readFileSync(questionsPath, 'utf8')) as { questions: Question[] };
  return data.questions;
}

export function getTopicContent(domainId: string, topicId: string): TopicContent | null {
  const contentPath = path.join(
    CONTENT_DIR,
    domainId,
    'topics',
    topicId,
    'content.md'
  );
  
  if (!fs.existsSync(contentPath)) return null;
  
  const fileContent = fs.readFileSync(contentPath, 'utf8');
  const { data, content } = matter(fileContent);
  
  return {
    frontmatter: data as TopicFrontmatter,
    content,
  };
}
```

---

## Styling Conventions

### Tailwind Usage

```typescript
// Use clsx for conditional classes
import { clsx } from 'clsx';

<div className={clsx(
  'rounded-lg border p-4',
  isCorrect && 'border-green-500 bg-green-50',
  isIncorrect && 'border-red-500 bg-red-50',
  !showResult && 'border-gray-200'
)} />

// Use consistent spacing scale
// p-2 (8px), p-4 (16px), p-6 (24px), p-8 (32px)
// gap-2, gap-4, gap-6, gap-8

// Use semantic color classes
// text-foreground, text-muted-foreground
// bg-background, bg-muted, bg-card
// border-border, border-input
```

### Component Variants with CVA

```typescript
// src/components/ui/status-badge.tsx
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
  {
    variants: {
      status: {
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        error: 'bg-red-100 text-red-800',
        info: 'bg-blue-100 text-blue-800',
      },
    },
    defaultVariants: {
      status: 'info',
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  return <span className={badgeVariants({ status })}>{children}</span>;
}
```

---

## Error Handling

### API Error Pattern

```typescript
// src/lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// Usage in API route
try {
  // ... logic
} catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

### Client Error Boundary

```typescript
// src/components/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Testing Patterns

### Unit Test Example

```typescript
// src/lib/assess/__tests__/scorer.test.ts
import { describe, it, expect } from 'vitest';
import { calculateScore, identifyWeakAreas } from '../scorer';

describe('calculateScore', () => {
  it('calculates percentage correctly', () => {
    const result = calculateScore({
      correct: 12,
      total: 15,
    });
    expect(result.percentage).toBe(80);
  });

  it('handles zero questions', () => {
    const result = calculateScore({
      correct: 0,
      total: 0,
    });
    expect(result.percentage).toBe(0);
  });
});

describe('identifyWeakAreas', () => {
  it('identifies topics below threshold', () => {
    const attempts = [
      { topicId: 'vpc', correct: 2, total: 5 },
      { topicId: 'iam', correct: 4, total: 5 },
      { topicId: 's3', correct: 1, total: 5 },
    ];
    
    const weakAreas = identifyWeakAreas(attempts, 0.6);
    
    expect(weakAreas).toContain('vpc');
    expect(weakAreas).toContain('s3');
    expect(weakAreas).not.toContain('iam');
  });
});
```

---

## CDK Patterns

### Experiment Stack Template

```typescript
// cdk/lib/stacks/lab-vpc-peering.ts
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export interface VpcPeeringLabProps extends cdk.StackProps {
  labId: string;
}

export class VpcPeeringLabStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: VpcPeeringLabProps) {
    super(scope, id, props);

    // Tag all resources for easy identification and cleanup
    cdk.Tags.of(this).add('sap-study-lab', props.labId);
    cdk.Tags.of(this).add('auto-cleanup', 'true');

    // VPC 1
    const vpc1 = new ec2.Vpc(this, 'VPC1', {
      maxAzs: 2,
      cidr: '10.0.0.0/16',
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    // VPC 2
    const vpc2 = new ec2.Vpc(this, 'VPC2', {
      maxAzs: 2,
      cidr: '10.1.0.0/16',
      subnetConfiguration: [
        { name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: 'Private', subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
      ],
    });

    // Peering connection
    const peering = new ec2.CfnVPCPeeringConnection(this, 'VPCPeering', {
      vpcId: vpc1.vpcId,
      peerVpcId: vpc2.vpcId,
    });

    // Outputs for lab guide
    new cdk.CfnOutput(this, 'VPC1Id', { value: vpc1.vpcId });
    new cdk.CfnOutput(this, 'VPC2Id', { value: vpc2.vpcId });
    new cdk.CfnOutput(this, 'PeeringConnectionId', { value: peering.ref });
  }
}
```

---

## Common Pitfalls to Avoid

1. **Don't use `'use client'` unnecessarily** - Only add when component needs hooks or browser APIs
2. **Don't fetch in Server Components** - Use the content loader for static content
3. **Don't store AWS credentials in database** - Use environment variables only
4. **Don't forget to handle loading states** - Always use Suspense boundaries
5. **Don't use inline styles** - Use Tailwind classes consistently
6. **Don't create API routes for static content** - Load from filesystem directly
7. **Don't forget CDK cleanup** - Always tag resources and implement destroy functionality
