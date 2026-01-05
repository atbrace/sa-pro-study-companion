# AWS Solutions Architect Professional Study Application

## Project Specification (SAP-C02)

---

## Overview

A local-first, single-user study application for AWS Solutions Architect Professional (SAP-C02) certification preparation. The app provides adaptive assessments, AI-powered tutoring, curated study content with official AWS documentation links, and guided hands-on experiments using real AWS resources.

### Key Design Principles

- **Assessment-driven learning**: Initial quick knowledge checks identify weak areas, deeper dives unlock as user progresses
- **Official sources**: All content links to AWS documentation, whitepapers, and FAQs
- **Hands-on practice**: Guided experiments provision real AWS resources via CDK
- **AI tutor**: Always-on contextual help powered by Claude API
- **Flexible navigation**: Jump between domains freely based on assessment results

---

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Next.js 14 (App Router) | SSR, API routes, excellent DX |
| **Language** | TypeScript | Type safety, better tooling |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid UI, consistent design |
| **Database** | SQLite (via better-sqlite3) | Zero-config, file-based, local-first |
| **AI** | Claude API (claude-sonnet-4-20250514) | Fast, cost-effective tutoring |
| **AWS Experiments** | AWS CDK v2 (TypeScript) | Programmatic resource management |
| **Package Manager** | pnpm | Fast, disk-efficient |

### Directory Structure

```
aws-sap-study-app/
├── SPEC.md                          # This file
├── SKILL.md                         # Claude Code development conventions
├── STYLE.md                         # UI/output formatting standards
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .env.local.example               # Environment template
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Dashboard/home
│   │   ├── study/
│   │   │   └── [domain]/
│   │   │       └── [topic]/
│   │   │           └── page.tsx     # Study content view
│   │   ├── assess/
│   │   │   ├── page.tsx             # Assessment hub
│   │   │   └── [domain]/
│   │   │       └── page.tsx         # Domain assessment
│   │   ├── experiments/
│   │   │   ├── page.tsx             # Experiment list
│   │   │   └── [lab]/
│   │   │       └── page.tsx         # Lab execution view
│   │   ├── progress/
│   │   │   └── page.tsx             # Progress dashboard
│   │   └── api/
│   │       ├── tutor/
│   │       │   └── route.ts         # Claude API proxy
│   │       ├── assess/
│   │       │   └── route.ts         # Assessment submission
│   │       ├── progress/
│   │       │   └── route.ts         # Progress CRUD
│   │       └── experiments/
│   │           └── route.ts         # CDK deployment trigger
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Navigation.tsx
│   │   ├── study/
│   │   │   ├── ContentViewer.tsx
│   │   │   ├── DocLink.tsx          # AWS doc link component
│   │   │   └── ServiceCard.tsx
│   │   ├── assess/
│   │   │   ├── QuestionCard.tsx
│   │   │   ├── QuizProgress.tsx
│   │   │   └── ResultsSummary.tsx
│   │   ├── tutor/
│   │   │   ├── TutorPanel.tsx       # Slide-out AI tutor
│   │   │   ├── ChatMessage.tsx
│   │   │   └── ContextIndicator.tsx
│   │   ├── experiments/
│   │   │   ├── LabGuide.tsx
│   │   │   ├── ResourceStatus.tsx
│   │   │   └── CleanupButton.tsx
│   │   └── progress/
│   │       ├── DomainChart.tsx
│   │       ├── WeakAreasList.tsx
│   │       └── StudyStreak.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts            # SQLite schema definitions
│   │   │   ├── client.ts            # Database client
│   │   │   ├── migrations/          # Schema migrations
│   │   │   └── seed.ts              # Initial data seeding
│   │   ├── claude/
│   │   │   ├── client.ts            # Claude API client
│   │   │   └── prompts.ts           # System prompts for tutor
│   │   ├── content/
│   │   │   ├── loader.ts            # Content file loader
│   │   │   └── types.ts             # Content type definitions
│   │   ├── assess/
│   │   │   ├── engine.ts            # Assessment logic
│   │   │   ├── scorer.ts            # Scoring algorithms
│   │   │   └── adaptive.ts          # Adaptive question selection
│   │   └── experiments/
│   │       ├── deployer.ts          # CDK deployment wrapper
│   │       └── cleanup.ts           # Resource cleanup
│   │
│   ├── hooks/
│   │   ├── useProgress.ts
│   │   ├── useTutor.ts
│   │   ├── useAssessment.ts
│   │   └── useExperiment.ts
│   │
│   └── types/
│       ├── domain.ts
│       ├── assessment.ts
│       ├── progress.ts
│       └── experiment.ts
│
├── content/                          # Study content (see CONTENT.md)
│   ├── domains/
│   │   ├── domain-1-organizational-complexity/
│   │   ├── domain-2-new-solutions/
│   │   ├── domain-3-continuous-improvement/
│   │   └── domain-4-migration-modernization/
│   └── experiments/
│       └── [lab-directories]/
│
├── cdk/                              # AWS CDK infrastructure
│   ├── bin/
│   │   └── app.ts
│   ├── lib/
│   │   └── stacks/                   # One stack per experiment
│   ├── cdk.json
│   └── package.json
│
├── scripts/
│   ├── seed-content.ts              # Load content into DB
│   ├── reset-progress.ts            # Reset user progress
│   └── cleanup-aws.ts               # Force cleanup all experiments
│
└── data/
    └── study.db                      # SQLite database file
```

---

## Database Schema

### Tables

```sql
-- User progress per topic
CREATE TABLE topic_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  mastery_level REAL DEFAULT 0.0,      -- 0.0 to 1.0
  questions_attempted INTEGER DEFAULT 0,
  questions_correct INTEGER DEFAULT 0,
  last_studied_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(domain_id, topic_id)
);

-- Individual question attempts
CREATE TABLE question_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INTEGER,
  mode TEXT NOT NULL,                   -- 'timed' or 'relaxed'
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assessment sessions
CREATE TABLE assessment_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT,                       -- NULL for full assessment
  session_type TEXT NOT NULL,           -- 'initial', 'deep_dive', 'review'
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percentage REAL NOT NULL,
  time_taken_seconds INTEGER,
  started_at DATETIME NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Experiment deployments
CREATE TABLE experiment_deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lab_id TEXT NOT NULL,
  stack_name TEXT NOT NULL,
  status TEXT NOT NULL,                 -- 'deploying', 'deployed', 'failed', 'destroyed'
  resources_json TEXT,                  -- JSON of deployed resources
  deployed_at DATETIME,
  destroyed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Study sessions (for time tracking)
CREATE TABLE study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT,
  topic_id TEXT,
  activity_type TEXT NOT NULL,          -- 'study', 'assess', 'experiment'
  duration_seconds INTEGER NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tutor conversations (for context)
CREATE TABLE tutor_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  context_domain TEXT,
  context_topic TEXT,
  context_question_id TEXT,
  messages_json TEXT NOT NULL,          -- JSON array of messages
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Weak areas identified by assessments
CREATE TABLE weak_areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id TEXT NOT NULL,
  topic_id TEXT NOT NULL,
  service_or_concept TEXT NOT NULL,
  identified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME,
  UNIQUE(domain_id, topic_id, service_or_concept)
);
```

### Indexes

```sql
CREATE INDEX idx_topic_progress_domain ON topic_progress(domain_id);
CREATE INDEX idx_question_attempts_question ON question_attempts(question_id);
CREATE INDEX idx_question_attempts_topic ON question_attempts(domain_id, topic_id);
CREATE INDEX idx_assessment_sessions_domain ON assessment_sessions(domain_id);
CREATE INDEX idx_weak_areas_unresolved ON weak_areas(resolved_at) WHERE resolved_at IS NULL;
```

---

## API Contracts

### POST /api/assess

Submit assessment answers and get results.

**Request:**
```typescript
{
  sessionId: string;
  domainId?: string;
  answers: Array<{
    questionId: string;
    selectedAnswer: string | string[];  // string[] for multi-select
    timeSeconds: number;
  }>;
  mode: 'timed' | 'relaxed';
}
```

**Response:**
```typescript
{
  score: number;                        // 0-100
  correctCount: number;
  totalCount: number;
  timeSeconds: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    correctAnswer: string | string[];
    explanation: string;
    awsDocLink?: string;
  }>;
  weakAreas: Array<{
    topicId: string;
    topicName: string;
    services: string[];
  }>;
  recommendations: {
    reviewTopics: string[];
    suggestedExperiments: string[];
  };
}
```

### POST /api/tutor

Send message to AI tutor with context.

**Request:**
```typescript
{
  message: string;
  context: {
    domainId?: string;
    topicId?: string;
    questionId?: string;
    currentContent?: string;            // Current study material being viewed
  };
  conversationId?: string;              // For continuing conversations
}
```

**Response:**
```typescript
{
  conversationId: string;
  response: string;                     // Markdown formatted
  suggestedLinks?: Array<{
    title: string;
    url: string;
    type: 'doc' | 'whitepaper' | 'faq';
  }>;
  suggestedQuestions?: string[];        // Follow-up questions
}
```

### GET /api/progress

Get user progress summary.

**Response:**
```typescript
{
  overall: {
    masteryScore: number;               // 0-100
    questionsAttempted: number;
    questionsCorrect: number;
    studyTimeMinutes: number;
    experimentsCompleted: number;
  };
  domains: Array<{
    domainId: string;
    domainName: string;
    weight: number;                     // Exam weight percentage
    masteryScore: number;
    topicsCompleted: number;
    totalTopics: number;
    weakAreas: string[];
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
  readinessEstimate: {
    score: number;                      // Estimated exam score
    confidence: 'low' | 'medium' | 'high';
    recommendation: string;
  };
}
```

### POST /api/experiments

Deploy or destroy experiment resources.

**Request:**
```typescript
{
  action: 'deploy' | 'destroy';
  labId: string;
}
```

**Response:**
```typescript
{
  deploymentId: string;
  status: 'deploying' | 'deployed' | 'destroying' | 'destroyed' | 'failed';
  stackName: string;
  resources?: Array<{
    type: string;
    name: string;
    arn?: string;
    consoleUrl?: string;
  }>;
  estimatedCost?: {
    hourly: number;
    daily: number;
  };
  error?: string;
}
```

---

## Features by Phase

### Phase 1: Foundation
- [x] Project scaffolding (Next.js, TypeScript, Tailwind)
- [ ] SQLite database setup with schema
- [ ] Basic navigation and layout components
- [ ] Content loader for YAML/Markdown files
- [ ] Domain overview pages

### Phase 2: Content & Assessment
- [ ] Study content pages with AWS doc links
- [ ] Quick knowledge check quiz component
- [ ] Assessment engine with scoring
- [ ] Progress tracking and storage
- [ ] Weak areas identification

### Phase 3: AI Tutor
- [ ] Claude API integration
- [ ] Tutor panel UI (slide-out drawer)
- [ ] Context-aware prompting
- [ ] Conversation history storage
- [ ] Suggested follow-up questions

### Phase 4: Experiments
- [ ] CDK stack templates for each lab
- [ ] Lab guide renderer (Markdown)
- [ ] Deployment status tracking
- [ ] Resource cleanup automation
- [ ] Cost estimation display

### Phase 5: Polish
- [ ] Progress visualization charts
- [ ] Exam readiness estimator
- [ ] Study time tracking
- [ ] Export/import progress
- [ ] Performance optimizations

---

## Environment Variables

```bash
# .env.local
ANTHROPIC_API_KEY=sk-ant-...           # Claude API key

# AWS credentials (for experiments)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1

# Optional
DATABASE_PATH=./data/study.db           # SQLite file location
```

---

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Database operations
pnpm db:migrate                         # Run migrations
pnpm db:seed                            # Seed content data
pnpm db:reset                           # Reset all progress

# Content operations
pnpm content:validate                   # Validate YAML/MD files
pnpm content:stats                      # Show content statistics

# Experiment operations
pnpm cdk:deploy <lab-id>               # Deploy specific lab
pnpm cdk:destroy <lab-id>              # Destroy specific lab
pnpm cdk:cleanup                        # Destroy all experiments
```

---

## Acceptance Criteria

### Assessment System
- [ ] Initial assessment: 15 quick knowledge checks per domain
- [ ] Questions randomized from pool
- [ ] Immediate feedback with explanations
- [ ] Links to relevant AWS documentation
- [ ] Timed mode: 2 minutes per question average
- [ ] Relaxed mode: no time pressure
- [ ] Score breakdown by topic
- [ ] Weak areas automatically identified

### Progress Tracking
- [ ] Mastery score per topic (0-100%)
- [ ] Domain-level aggregated scores
- [ ] Weighted overall score (matching exam weights)
- [ ] Question attempt history
- [ ] Time spent studying
- [ ] Experiments completed

### AI Tutor
- [ ] Context-aware responses based on current view
- [ ] Explains incorrect answers when asked
- [ ] Suggests related topics to study
- [ ] Links to official AWS resources
- [ ] Conversation history preserved
- [ ] Available on all pages via slide-out panel

### Experiments
- [ ] Clear lab guide with objectives
- [ ] One-click deployment via CDK
- [ ] Real-time deployment status
- [ ] Console links for deployed resources
- [ ] Cost warnings before deployment
- [ ] One-click cleanup
- [ ] Automatic cleanup reminder after 4 hours

### Target Pass Rate
- User should achieve **85% or higher** on domain quizzes before the app considers them "exam ready" for that domain

---

## Content Requirements

See `/content/` directory and the domain-specific files for:
- Topic breakdowns aligned with SAP-C02 exam guide
- 15 knowledge check questions per topic
- Study summaries with AWS documentation links
- 8-12 guided experiments covering key services

---

## Non-Functional Requirements

- **Performance**: Page load < 1s, quiz submission < 500ms
- **Offline**: Study content available offline after initial load
- **Data**: All progress stored locally in SQLite
- **Security**: AWS credentials never exposed to browser
- **Cost**: Experiments include cost estimates, auto-cleanup reminders
