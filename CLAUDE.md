# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Solutions Architect Professional (SAP-C02) study application - a local-first, single-user app for certification preparation featuring adaptive assessments, AI tutoring powered by Claude API, curated study content with AWS documentation links, and guided hands-on experiments using real AWS resources via CDK.

**Key Design Principles:**
- Assessment-driven learning with adaptive question selection
- All content links to official AWS sources (docs, whitepapers, FAQs)
- Hands-on practice with real AWS resource provisioning
- Context-aware AI tutor using Claude API
- Local-first with SQLite storage

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite via better-sqlite3 (sync API)
- **AI:** Claude API (claude-sonnet-4-20250514)
- **AWS Infrastructure:** CDK v2 (TypeScript)
- **Package Manager:** pnpm

## Development Commands

```bash
# Dependencies
pnpm install

# Development
pnpm dev

# Build & Production
pnpm build
pnpm start

# Database operations
pnpm db:migrate           # Run schema migrations
pnpm db:seed              # Seed initial content
pnpm db:reset             # Reset all user progress

# Content validation
pnpm content:validate     # Validate YAML/MD files
pnpm content:stats        # Show content statistics

# AWS Experiments
pnpm cdk:deploy <lab-id>  # Deploy specific lab
pnpm cdk:destroy <lab-id> # Destroy specific lab
pnpm cdk:cleanup          # Destroy all experiments
```

## Architecture

### Directory Structure

```
src/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   │   ├── tutor/           # Claude API proxy
│   │   ├── assess/          # Assessment submission
│   │   ├── progress/        # Progress CRUD
│   │   └── experiments/     # CDK deployment triggers
│   ├── study/[domain]/[topic]/  # Study content pages
│   ├── assess/[domain]/     # Assessment pages
│   ├── experiments/[lab]/   # Lab execution views
│   └── progress/            # Progress dashboard
├── components/
│   ├── ui/                  # shadcn/ui base components
│   ├── layout/              # Sidebar, Header, Navigation
│   ├── study/               # ContentViewer, DocLink, ServiceCard
│   ├── assess/              # QuestionCard, QuizProgress, ResultsSummary
│   ├── tutor/               # TutorPanel (slide-out), ChatMessage
│   ├── experiments/         # LabGuide, ResourceStatus, CleanupButton
│   └── progress/            # DomainChart, WeakAreasList
├── lib/
│   ├── db/                  # SQLite client, schema, migrations
│   ├── claude/              # Claude API client & prompts
│   ├── content/             # Content loader for YAML/MD files
│   ├── assess/              # Assessment engine, scoring, adaptive selection
│   └── experiments/         # CDK deployment wrapper & cleanup
├── hooks/                   # useProgress, useTutor, useAssessment
└── types/                   # TypeScript type definitions

content/
├── domains/                 # Study content by SAP-C02 domain
│   ├── domain-1-organizational-complexity/
│   │   ├── meta.yaml       # Domain metadata
│   │   ├── overview.md     # Domain overview
│   │   └── topics/
│   │       └── [topic]/
│   │           ├── meta.yaml
│   │           ├── content.md
│   │           └── questions.yaml  # 15+ knowledge checks per topic
│   └── [domain-2,3,4]/
└── experiments/             # CDK lab definitions
    └── [lab-id]/
        ├── README.md        # Lab guide
        └── cdk/stack.ts     # Infrastructure

cdk/                         # CDK app for experiments
data/                        # SQLite database file
```

### Database Schema

Key tables:
- `topic_progress` - Mastery level (0-1.0), questions attempted/correct per topic
- `question_attempts` - Individual question history with timing
- `assessment_sessions` - Full assessment results with scores
- `experiment_deployments` - CDK stack deployment status and resources
- `tutor_conversations` - Chat history with context (domain/topic/question)
- `weak_areas` - Identified weak topics from assessments

**Critical:** Use better-sqlite3 **synchronous** API (not async). Database queries run in API routes and server components.

## Key Development Patterns

### Page Components (Server Components)

```typescript
// src/app/study/[domain]/[topic]/page.tsx
interface PageProps {
  params: Promise<{ domain: string; topic: string }>;
}

export default async function TopicPage({ params }: PageProps) {
  const { domain, topic } = await params;
  const content = await getTopicContent(domain, topic);

  if (!content) notFound();

  return <ContentViewer content={content} />;
}
```

### API Routes Pattern

```typescript
// src/app/api/assess/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Process with db.prepare().run/get/all (sync API)
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: 'Message' }, { status: 500 });
  }
}
```

### Database Queries (Synchronous)

```typescript
// Always use sync API with better-sqlite3
import { db } from '@/lib/db/client';

// Single row
const row = db.prepare('SELECT * FROM topic_progress WHERE id = ?').get(id);

// Multiple rows
const rows = db.prepare('SELECT * FROM questions WHERE domain_id = ?').all(domainId);

// Insert/Update
db.prepare('INSERT INTO progress (...) VALUES (...)').run(values);

// Upsert with ON CONFLICT
db.prepare(`
  INSERT INTO topic_progress (domain_id, topic_id, questions_attempted)
  VALUES (?, ?, 1)
  ON CONFLICT(domain_id, topic_id) DO UPDATE SET
    questions_attempted = questions_attempted + 1,
    updated_at = CURRENT_TIMESTAMP
`).run(domainId, topicId);
```

### Content Loading

```typescript
// src/lib/content/loader.ts - Server-side only
import fs from 'fs';
import yaml from 'js-yaml';
import matter from 'gray-matter';

// Load from filesystem at runtime
export function getDomainById(domainId: string): Domain | null {
  const metaPath = path.join(CONTENT_DIR, domainId, 'meta.yaml');
  const meta = yaml.load(fs.readFileSync(metaPath, 'utf8'));
  return { ...meta, topics: getTopicsForDomain(domainId) };
}
```

### Claude API Integration

```typescript
// src/app/api/tutor/route.ts
import { claudeClient } from '@/lib/claude/client';
import { buildTutorPrompt } from '@/lib/claude/prompts';

const response = await claudeClient.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2048,
  system: buildTutorPrompt(context), // Context-aware system prompt
  messages: history,
});

// Store conversation in tutor_conversations table
```

### Client Components

- Only use `'use client'` when component needs hooks or browser APIs
- Prefer server components for static content rendering
- Use custom hooks (useAssessment, useTutor, useProgress) for complex state

### Styling Conventions

```tsx
import { clsx } from 'clsx';

// Conditional classes
<div className={clsx(
  'rounded-lg border p-4',
  isCorrect && 'border-green-500 bg-green-50',
  isIncorrect && 'border-red-500 bg-red-50'
)} />

// Consistent spacing: p-2/4/6/8, gap-2/4/6/8
// Semantic colors: text-foreground, bg-muted, border-border
```

## SAP-C02 Content Structure

Four exam domains aligned with AWS certification guide:
1. **Domain 1:** Organizational Complexity (26% weight)
2. **Domain 2:** New Solutions Design (29% weight)
3. **Domain 3:** Continuous Improvement (25% weight)
4. **Domain 4:** Migration & Modernization (20% weight)

Each domain contains:
- Multiple topics mapped to exam tasks
- 15+ knowledge check questions per topic (YAML format)
- Study content with AWS doc links (Markdown)
- Related hands-on experiments (CDK stacks)

### Content File Formats

**Domain meta.yaml:**
```yaml
id: domain-1-organizational-complexity
name: Design Solutions for Organizational Complexity
weight: 26
topics: [network-connectivity, security-controls, ...]
keyServices: [Amazon VPC, AWS Transit Gateway, ...]
awsDocLinks: [{ title: '...', url: '...', type: doc|whitepaper|faq }]
```

**Topic questions.yaml:**
```yaml
questions:
  - id: unique-id-001
    type: single | multi
    correctCount: 2  # for multi-select only
    text: Question text...
    options:
      - { id: A, text: Option A }
      - { id: B, text: Option B }
    correctAnswer: B  # or [A, C] for multi
    explanation: Why this is correct...
    awsDocLink: https://docs.aws.amazon.com/...
    services: [Service1, Service2]
```

## CDK Experiment Standards

```typescript
// cdk/lib/stacks/lab-*.ts
export class LabStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: LabProps) {
    super(scope, id, props);

    // Tag ALL resources for identification & cleanup
    cdk.Tags.of(this).add('sap-study-lab', props.labId);
    cdk.Tags.of(this).add('auto-cleanup', 'true');

    // Use minimal instance sizes (t3.micro, t3.small)
    // Provide outputs for console links
    new cdk.CfnOutput(this, 'ResourceId', { value: resource.id });
  }
}
```

**Critical:** Every experiment must:
- Support clean `cdk destroy` without manual intervention
- Include cost estimates in README.md
- Tag all resources with `sap-study-lab` and `auto-cleanup`
- Provide console URLs via stack outputs

## Component Naming & Organization

```
PascalCase.tsx     # React components (QuestionCard.tsx)
camelCase.ts       # Utilities & types (scoreCalculator.ts)
route.ts           # API routes (always named route.ts)
kebab-case.yaml    # Content files (questions.yaml)
```

**Import order:**
1. React/Next imports
2. External libraries
3. Internal components (@/components/*)
4. Internal utilities (@/lib/*)
5. Types (@/types/*)

## Error Handling

```typescript
// Custom error classes
export class AppError extends Error {
  constructor(message: string, public statusCode: number, public code?: string) {
    super(message);
  }
}

// API routes always catch and return appropriate status
try {
  // logic
} catch (error) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message }, { status: error.statusCode });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

## Environment Variables

Required in `.env.local`:
```bash
ANTHROPIC_API_KEY=sk-ant-...          # Claude API key
AWS_ACCESS_KEY_ID=...                 # For CDK deployments
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
DATABASE_PATH=./data/study.db         # Optional, defaults to ./data/study.db
```

**Security:** AWS credentials NEVER exposed to browser - only used in API routes and CDK deployments.

## Testing

```typescript
// Unit tests with Vitest
// src/lib/assess/__tests__/scorer.test.ts
import { describe, it, expect } from 'vitest';
import { calculateScore } from '../scorer';

describe('calculateScore', () => {
  it('calculates percentage correctly', () => {
    const result = calculateScore({ correct: 12, total: 15 });
    expect(result.percentage).toBe(80);
  });
});
```

## UI/UX Standards

- **Assessment target:** 85%+ mastery before "exam ready"
- **Tutor panel:** Slide-out drawer on all pages (not modal)
- **AWS doc links:** External link icon, open in new tab
- **Progress bars:** Color-coded (green ≥85%, amber 60-84%, red <60%)
- **Responsive:** Mobile-first, sidebar hidden <1024px
- **Accessibility:** Keyboard nav, focus states, sufficient contrast

## Common Pitfalls to Avoid

1. Don't use `'use client'` unnecessarily - server components by default
2. Don't use async database API - better-sqlite3 is synchronous only
3. Don't expose AWS credentials to client - only in API routes/server
4. Don't forget Suspense boundaries for async server components
5. Don't create API routes for static content - load from filesystem
6. Don't forget CDK resource tags for cleanup (`sap-study-lab`, `auto-cleanup`)
7. Don't skip cost estimates in lab README files

## Phase Implementation Notes

This project is in early development. Current phase priorities are documented in SPEC.md under "Features by Phase". Always check phase status before implementing features to ensure proper dependency order (Foundation → Content & Assessment → AI Tutor → Experiments → Polish).
