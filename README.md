# AWS Solutions Architect Professional Study Companion

A local-first study application for AWS Solutions Architect Professional (SAP-C02) certification preparation. Features adaptive assessments, AI-powered tutoring with Claude, curated study content with official AWS documentation links, and guided hands-on experiments.

## Features

- **Adaptive Assessments**: Domain-specific quizzes with 65+ questions for Domain 1 (Organizational Complexity)
- **AI Tutor**: Context-aware tutoring powered by Claude API - ask questions about any AWS topic
- **Progress Tracking**: Visual dashboards showing mastery levels, weak areas, and study streaks
- **Study Content**: Comprehensive study guides with links to official AWS docs, whitepapers, and FAQs
- **Hands-on Labs**: (Coming soon) CDK-based experiments to practice with real AWS resources

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **AI**: Claude API (claude-sonnet-4-20250514)
- **Package Manager**: pnpm

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **pnpm** 8.x or higher (install via `npm install -g pnpm`)
- **Claude API Key** from Anthropic ([Get API key](https://console.anthropic.com/))
- **(Optional) AWS Account** for hands-on experiments (future feature)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/sa-pro-study-companion.git
cd sa-pro-study-companion
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your API keys:

```env
# Required: Claude API key for AI tutor
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here

# Optional: Database path (defaults to ./data/study.db)
DATABASE_PATH=./data/study.db

# Optional: AWS credentials for CDK experiments (future feature)
# AWS_ACCESS_KEY_ID=your-access-key
# AWS_SECRET_ACCESS_KEY=your-secret-key
# AWS_REGION=us-east-1
```

**Getting a Claude API Key:**
1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to API Keys
4. Create a new API key
5. Copy the key (starts with `sk-ant-`)

### 4. Initialize the Database

Run migrations to create the database schema:

```bash
pnpm db:migrate
```

Seed the database with study content:

```bash
pnpm db:seed
```

## Running the Application

### Development Mode

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build and run the production version:

```bash
pnpm build
pnpm start
```

## Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server
pnpm lint             # Run ESLint

# Database Operations
pnpm db:migrate       # Run database migrations
pnpm db:seed          # Seed content into database
pnpm db:reset         # Reset all user progress (keeps content)

# Content Management
pnpm content:validate # Validate YAML/MD content files
pnpm content:stats    # Show content statistics

# AWS Experiments (Coming Soon)
pnpm cdk:deploy <lab-id>   # Deploy a specific lab
pnpm cdk:destroy <lab-id>  # Destroy a specific lab
pnpm cdk:cleanup           # Destroy all lab stacks
```

## Usage Guide

### 1. Study Content

Navigate to a domain and topic to access study material:
- **Domain 1**: Organizational Complexity
  - Network Connectivity
  - Security Controls
  - Resilient Architectures
  - Multi-Account Environment
  - Cost Optimization

Each topic includes:
- Comprehensive study notes
- Key services and concepts
- Links to official AWS documentation
- Knowledge check questions

### 2. Take Assessments

Click "Assess" in the sidebar to take domain-specific quizzes:
- 15 questions randomly selected from the topic pool
- Mix of single-select and multi-select questions
- Immediate feedback with explanations
- Results saved to track progress

### 3. Ask the AI Tutor

Click the chat icon (bottom right) to open the AI tutor:
- Ask questions about any AWS topic
- Get context-aware explanations
- Request clarification on study material
- Practice with scenario-based questions

The tutor automatically understands which domain/topic you're studying for better context.

### 4. Track Your Progress

Visit the Progress page to see:
- **Mastery Scores**: Radar and bar charts showing performance across domains
- **Weak Areas**: Topics that need more study based on assessment results
- **Study Streak**: Recent activity timeline
- **Readiness Estimate**: Projected exam readiness percentage

Target 85%+ mastery across all domains before attempting the real exam.

## Project Structure

```
sa-pro-study-companion/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes (tutor, assess, progress)
│   │   ├── study/[domain]/    # Study content pages
│   │   ├── assess/[domain]/   # Assessment pages
│   │   └── progress/          # Progress dashboard
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── assess/            # Assessment components
│   │   ├── tutor/             # AI tutor panel
│   │   └── progress/          # Progress charts
│   ├── lib/
│   │   ├── db/                # SQLite client & schema
│   │   ├── claude/            # Claude API client
│   │   ├── content/           # Content loader
│   │   └── assess/            # Assessment logic
│   └── hooks/                 # React hooks
├── content/
│   └── domains/               # Study content (YAML/MD)
│       └── domain-1-organizational-complexity/
│           └── topics/
│               ├── network-connectivity/
│               ├── security-controls/
│               ├── resilient-architectures/
│               ├── multi-account-environment/
│               └── cost-optimization/
├── data/
│   └── study.db               # SQLite database (auto-created)
└── public/                    # Static assets
```

## Content Structure

Study content is stored as YAML and Markdown files in `content/domains/`:

- **meta.yaml**: Domain/topic metadata, key services, AWS doc links
- **content.md**: Study notes in Markdown with code examples
- **questions.yaml**: Assessment questions with explanations

Each topic includes 15+ SAP-C02-level questions mapped to official exam tasks.

## Database Schema

The SQLite database stores:
- **topic_progress**: Mastery levels and question statistics per topic
- **question_attempts**: Individual question history with timestamps
- **assessment_sessions**: Complete assessment results
- **tutor_conversations**: AI chat history with context
- **weak_areas**: Identified topics needing review

Progress is calculated based on weighted accuracy across domain topics.

## Development Notes

### Adding New Content

1. Create a new topic directory in `content/domains/domain-X/topics/your-topic/`
2. Add `meta.yaml`, `content.md`, and `questions.yaml`
3. Update the parent `domain-X/meta.yaml` to include the new topic
4. Run `pnpm content:validate` to check formatting
5. Run `pnpm db:seed` to load content into database

### Database Synchronous API

This project uses **better-sqlite3** with the synchronous API (not async). All database queries use `.get()`, `.all()`, `.run()` directly without `await`.

Example:
```typescript
import { db } from '@/lib/db/client';

// Correct
const row = db.prepare('SELECT * FROM topic_progress WHERE id = ?').get(id);

// Incorrect (don't use async/await)
// const row = await db.prepare('...').get(id);
```

### AI Tutor Context

The tutor automatically receives context about:
- Current domain being studied
- Current topic being studied
- Question being reviewed (if on assessment results page)

This context is passed to Claude to provide relevant, targeted responses.

## Roadmap

- [x] Phase 1: Foundation (Next.js, SQLite, UI)
- [x] Phase 2: Assessment System & Progress Tracking
- [x] Phase 3: AI Tutor with Claude API
- [ ] Phase 4: Domain 2, 3, 4 content expansion
- [ ] Phase 5: AWS CDK hands-on experiments
- [ ] Phase 6: Flashcards and spaced repetition
- [ ] Phase 7: Mobile-responsive improvements

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add some feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- Study content based on [AWS SAP-C02 Exam Guide](https://aws.amazon.com/certification/certified-solutions-architect-professional/)
- All AWS documentation links point to official AWS sources
- AI tutoring powered by [Anthropic's Claude](https://www.anthropic.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Review the SAP-C02 exam guide for official exam requirements
- Check the [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

**Note**: This is a study tool and not affiliated with AWS or Amazon. For official AWS certification information, visit [aws.amazon.com/certification](https://aws.amazon.com/certification/).
