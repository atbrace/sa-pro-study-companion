# AWS Solutions Architect Professional Study Companion

A local-first study application for AWS Solutions Architect Professional (SAP-C02) certification preparation. Features adaptive assessments, AI-powered tutoring with Claude, curated study content with official AWS documentation links, and guided hands-on experiments.

## Features

- **Adaptive Assessments**: Domain-specific quizzes with 300+ questions across all 4 SAP-C02 domains
- **AI Tutor**: Context-aware tutoring powered by Claude API - ask questions about any AWS topic with section-specific help buttons
- **Progress Tracking**: Visual dashboards showing mastery levels, weak areas, and assessment history
- **Study Content**: 20+ topics with comprehensive study guides linked to official AWS docs, whitepapers, and FAQs
- **Hands-on Labs**: 7 CDK-based experiments to practice with real AWS resources (VPC, Lambda, ECS, S3, RDS, DynamoDB, Step Functions)

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
- **(Optional) AWS Account** for hands-on experiments with CDK deployments

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/sa-pro-study-companion.git
cd sa-pro-study-companion
pnpm install

# Set up environment
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# Initialize database
pnpm db:migrate
pnpm db:seed

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start studying!

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

# Optional: AWS credentials for CDK experiments
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
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

# AWS Experiments
pnpm cdk:deploy <lab-id>   # Deploy a specific lab (requires AWS credentials)
pnpm cdk:destroy <lab-id>  # Destroy a specific lab
pnpm cdk:cleanup           # Destroy all lab stacks
```

## Usage Guide

### 1. Study Content

Navigate to any domain and topic to access study material across all 4 SAP-C02 domains:

- **Domain 1**: Design Solutions for Organizational Complexity (26% of exam)
- **Domain 2**: Design Solutions for New Workloads (29% of exam)
- **Domain 3**: Continuous Improvement for Existing Solutions (25% of exam)
- **Domain 4**: Accelerate Workload Migration and Modernization (20% of exam)

Each of the 20+ topics includes:
- Comprehensive study notes with practical examples
- Key AWS services and concepts
- Links to official AWS documentation, whitepapers, and FAQs
- 15+ knowledge check questions per topic

### 2. Take Assessments

Click "Assess" in the sidebar to take domain-specific quizzes:
- 15 questions per assessment, randomly selected from each domain's topic pool
- Mix of single-select and multi-select questions matching SAP-C02 exam format
- Immediate feedback with detailed explanations
- Links to AWS documentation for further study
- Results saved to track progress and identify weak areas

### 3. Ask the AI Tutor

Click "Ask AI" buttons throughout the app or use the chat icon (bottom right):
- Context-aware help based on the section you're viewing
- Ask questions about any AWS topic or service
- Get detailed explanations with links to official AWS docs
- Request clarification on study material or assessment questions
- Practice with scenario-based questions

The tutor automatically understands which domain/topic you're studying and provides targeted, relevant answers.

### 4. Track Your Progress

Visit the Progress page to see:
- **Mastery Scores**: Performance breakdown across all domains
- **Assessment History**: Track your scores over time
- **Question Statistics**: See which topics you've mastered
- **Weak Areas**: Identify topics that need more study based on assessment results

Target 85%+ mastery across all domains before attempting the real exam.

### 5. Hands-on Experiments

Navigate to the Experiments page to deploy real AWS infrastructure:
- **VPC Networking**: Multi-AZ VPC with public/private subnets, NAT gateways, and routing
- **Lambda + API Gateway**: Serverless REST API with DynamoDB backend
- **ECS Fargate**: Containerized web application with ALB
- **S3 + CloudFront**: Static website with global CDN
- **RDS Multi-AZ**: MySQL database with read replicas and automated backups
- **DynamoDB + DAX**: NoSQL database with in-memory caching
- **Step Functions**: Serverless workflow orchestration with Lambda integration

Each lab includes:
- Detailed guide with objectives and architecture diagrams
- One-click deployment via AWS CDK
- Real-time deployment status
- Console links to deployed resources
- Cost estimates and cleanup instructions

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
│       ├── domain-1-organizational-complexity/
│       ├── domain-2-new-workloads/
│       ├── domain-3-continuous-improvement/
│       └── domain-4-migration-modernization/
│           └── topics/ (20+ topics total)
├── data/
│   └── study.db               # SQLite database (auto-created)
└── public/                    # Static assets
```

## Content Structure

Study content is organized as YAML and Markdown files in `content/domains/`:

- **Domain directories** (domain-1, domain-2, domain-3, domain-4): Each represents one of the 4 SAP-C02 exam domains
- **meta.yaml**: Domain/topic metadata, exam weight, key services, AWS documentation links
- **overview.md**: High-level domain introduction
- **topics/**: Individual topic directories with:
  - **content.md**: Detailed study notes with code examples and best practices
  - **questions.yaml**: 15+ practice questions with explanations and AWS doc links
  - **meta.yaml**: Topic metadata and service mappings

All content is validated on build to ensure quality and consistency.

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

## Development Status

**Completed:**
- [x] Foundation: Next.js 14, SQLite, shadcn/ui components
- [x] Assessment System: 300+ questions across all 4 SAP-C02 domains
- [x] Progress Tracking: Mastery scores, weak area identification
- [x] AI Tutor: Context-aware tutoring with Claude API (claude-sonnet-4-20250514)
- [x] Study Content: 20+ topics with official AWS documentation links
- [x] Hands-on Labs: 7 CDK-based experiments with real AWS infrastructure

**In Progress:**
- [ ] Enhanced progress visualizations (charts, timelines)
- [ ] Spaced repetition and flashcard system
- [ ] Export/import progress data
- [ ] Additional experiments for advanced scenarios

**Planned:**
- [ ] Mobile app companion
- [ ] Exam simulation mode (timed full-length practice tests)
- [ ] Community-contributed study notes and tips

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

- Study content aligned with [AWS SAP-C02 Exam Guide](https://aws.amazon.com/certification/certified-solutions-architect-professional/)
- All study materials link to official AWS documentation, whitepapers, and FAQs
- AI tutoring powered by [Anthropic's Claude](https://www.anthropic.com/) (claude-sonnet-4-20250514)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Infrastructure as Code with [AWS CDK](https://aws.amazon.com/cdk/)
- Charts and visualizations with [Recharts](https://recharts.org/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Review the [SAP-C02 exam guide](https://aws.amazon.com/certification/certified-solutions-architect-professional/) for official requirements
- Check the [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) for best practices
- Explore [AWS Whitepapers](https://aws.amazon.com/whitepapers/) for in-depth technical content

---

**Note**: This is a study tool and not affiliated with AWS or Amazon. For official AWS certification information, visit [aws.amazon.com/certification](https://aws.amazon.com/certification/).
