# AWS Certification Study Companion

A local-first study application for AWS certification preparation. Currently supports multiple exams with adaptive assessments, AI-powered tutoring (Claude or Gemini), curated study content with official AWS documentation links, and guided hands-on experiments.

## Supported Certifications

- **AWS Solutions Architect Professional (SAP-C02)** - Full support with study content, assessments, and hands-on labs
- **AWS Machine Learning Specialty (MLA-C01)** - Full support with study content, assessments, and hands-on labs

## Features

- **Multi-Exam Support**: Select your certification from the home page and study with exam-specific content
- **Adaptive Assessments**: Domain-specific quizzes across all exam domains
- **AI Tutor**: Context-aware tutoring powered by Claude or Gemini - ask questions about any AWS topic with section-specific help buttons
- **Progress Tracking**: Visual dashboards showing mastery levels, weak areas, and assessment history
- **Study Content**: Comprehensive study guides linked to official AWS docs, whitepapers, and FAQs
- **Hands-on Labs**: CDK-based experiments to practice with real AWS resources

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: SQLite (better-sqlite3)
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **AI**: Claude API or Google Gemini (configurable)
- **Package Manager**: pnpm

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **pnpm** 10.x (install via `npm install -g pnpm`)
- **LLM API Key** - one of the following:
  - **Claude API Key** from Anthropic ([Get API key](https://console.anthropic.com/))
  - **Google AI API Key** for Gemini ([Get API key](https://aistudio.google.com/apikey))
- **(Optional) AWS Account** for hands-on experiments with CDK deployments

## Quick Start

The easiest way to get started is using the installation script:

```bash
# Clone the repository
git clone https://github.com/atbrace/sa-pro-study-companion.git
cd sa-pro-study-companion

# Run the installation script
./install.sh
```

The script will:
- Check prerequisites (Node.js, pnpm)
- Install dependencies
- Guide you through selecting an LLM provider (Claude or Gemini)
- Help you configure your API key
- Initialize the database with study content
- Optionally start the development server

Open [http://localhost:3000](http://localhost:3000) and start studying!

## Installation

### Option A: Automated Installation (Recommended)

Run the installation script which handles everything interactively:

```bash
git clone https://github.com/atbrace/sa-pro-study-companion.git
cd sa-pro-study-companion
./install.sh
```

### Option B: Manual Installation

#### 1. Clone the Repository

```bash
git clone https://github.com/atbrace/sa-pro-study-companion.git
cd sa-pro-study-companion
```

#### 2. Install Dependencies

```bash
pnpm install
```

#### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory and configure your LLM provider:

```env
# LLM Provider: choose 'claude' or 'gemini'
LLM_PROVIDER=claude

# For Claude (if LLM_PROVIDER=claude)
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
CLAUDE_MODEL=claude-sonnet-4-20250514

# For Gemini (if LLM_PROVIDER=gemini)
# GOOGLE_AI_API_KEY=your-google-ai-key
# GEMINI_MODEL=gemini-3-flash-preview

# Optional: Database path (defaults to ./data/study.db)
DATABASE_PATH=./data/study.db

# Optional: AWS credentials for CDK experiments
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

**Supported Models:**

| Provider | Model ID | Description |
|----------|----------|-------------|
| Claude | `claude-sonnet-4-20250514` | Recommended - balanced capability and cost |
| Claude | `claude-opus-4-20250514` | Most capable, higher cost |
| Gemini | `gemini-3-flash-preview` | Fast and efficient |
| Gemini | `gemini-3-pro-preview` | Most capable Gemini 3 |
| Gemini | `gemini-2.5-flash` | Balanced performance |
| Gemini | `gemini-2.5-pro` | Advanced reasoning |
| Gemini | `gemini-2.0-flash` | Stable release |

**Getting API Keys:**

- **Claude**: Go to [console.anthropic.com](https://console.anthropic.com/), sign up, navigate to API Keys, and create a new key (starts with `sk-ant-`)
- **Gemini**: Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create a new API key

#### 4. Initialize the Database

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

### 1. Select Your Certification

Open [http://localhost:3000](http://localhost:3000) to see the exam picker. Choose from:
- **SAP-C02**: AWS Solutions Architect Professional
- **MLA-C01**: AWS Machine Learning Specialty

Each certification has its own study content, assessments, and progress tracking.

### 2. Study Content

Navigate to any domain and topic to access study material. Each topic includes:
- Comprehensive study notes with practical examples
- Key AWS services and concepts
- Links to official AWS documentation, whitepapers, and FAQs
- Knowledge check questions

### 3. Take Assessments

Click "Assessments" in the sidebar to take domain-specific quizzes:
- Questions randomly selected from the domain's topic pool
- Mix of single-select and multi-select questions matching exam format
- Immediate feedback with detailed explanations
- Links to AWS documentation for further study
- Results saved to track progress and identify weak areas

### 4. Ask the AI Tutor

Click "Ask AI" buttons throughout the app or use the chat icon:
- Context-aware help based on the section you're viewing
- Ask questions about any AWS topic or service
- Get detailed explanations with links to official AWS docs
- Request clarification on study material or assessment questions

The tutor automatically understands which exam, domain, and topic you're studying.

### 5. Track Your Progress

Visit the Progress page to see:
- **Mastery Scores**: Performance breakdown across all domains
- **Assessment History**: Track your scores over time
- **Weak Areas**: Identify topics that need more study

Target 85%+ mastery across all domains before attempting the real exam.

### 6. Hands-on Labs

Navigate to the Labs page to deploy real AWS infrastructure.

**SAP-C02 Labs (7 labs):**
- **VPC Networking**: Multi-AZ VPC with peering, security groups, and routing
- **Lambda + API Gateway**: Serverless REST API with DynamoDB backend
- **ECS Fargate**: Containerized web application with ALB
- **S3 + CloudFront**: Static website with global CDN
- **RDS Multi-AZ**: PostgreSQL with read replicas and automated backups
- **DynamoDB + DAX**: NoSQL database with in-memory caching
- **Step Functions**: Serverless workflow orchestration

**MLA-C01 Labs (12 labs):**
- **SageMaker Studio**: ML development environment setup
- **Feature Store**: Feature engineering and management
- **Data Wrangler**: Visual data preparation
- **Glue ETL**: Data transformation pipelines
- **SageMaker Training**: Model training workflows
- **Hyperparameter Tuning**: Automated optimization
- **SageMaker Autopilot**: AutoML experiments
- **SageMaker Endpoints**: Real-time inference deployment
- **Batch Transform**: Batch inference processing
- **SageMaker Pipelines**: ML workflow orchestration
- **Model Monitor**: Production model monitoring
- **SageMaker Clarify**: Bias detection and explainability

Each lab includes deployment commands, cost estimates, and cleanup instructions.

## Project Structure

```
sa-pro-study-companion/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes (tutor, assess, progress)
│   │   ├── [exam]/            # Exam-specific routes
│   │   │   ├── study/         # Study content pages
│   │   │   ├── assess/        # Assessment pages
│   │   │   ├── labs/          # Hands-on labs
│   │   │   └── progress/      # Progress dashboard
│   │   └── experiments/       # Lab detail pages
│   ├── components/
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── assess/            # Assessment components
│   │   ├── tutor/             # AI tutor panel
│   │   └── progress/          # Progress charts
│   ├── lib/
│   │   ├── db/                # SQLite client & schema
│   │   ├── llm/               # LLM provider abstraction (Claude/Gemini)
│   │   ├── content/           # Content loader
│   │   └── assess/            # Assessment logic
│   ├── contexts/              # React contexts (ExamContext)
│   └── hooks/                 # React hooks
├── content/
│   ├── exams/                 # Exam-specific content
│   │   ├── sap-c02/           # Solutions Architect Professional
│   │   │   ├── exam.yaml      # Exam configuration
│   │   │   └── domains/       # Domain content
│   │   └── mla-c01/           # Machine Learning Specialty
│   │       ├── exam.yaml
│   │       └── domains/
│   └── experiments/           # CDK lab definitions
├── data/
│   └── study.db               # SQLite database (auto-created)
└── public/                    # Static assets
```

## Content Structure

Study content is organized as YAML and Markdown files in `content/exams/[exam-id]/`:

- **exam.yaml**: Exam configuration (name, passing score, domain weights, tutor prompt)
- **domains/**: Domain directories for the exam
  - **meta.yaml**: Domain metadata, exam weight, key services, AWS documentation links
  - **overview.md**: High-level domain introduction
  - **topics/**: Individual topic directories with:
    - **content.md**: Detailed study notes with code examples and best practices
    - **questions.yaml**: Practice questions with explanations and AWS doc links
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

1. Create a new topic directory in `content/exams/[exam-id]/domains/[domain-id]/topics/[topic-id]/`
2. Add `meta.yaml`, `content.md`, and `questions.yaml`
3. Update the parent domain's `meta.yaml` to include the new topic
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

This context is passed to your configured LLM provider (Claude or Gemini) to provide relevant, targeted responses.

### Switching LLM Providers

To switch between Claude and Gemini, update your `.env.local`:

```env
# Switch to Gemini
LLM_PROVIDER=gemini
GOOGLE_AI_API_KEY=your-key-here
GEMINI_MODEL=gemini-3-flash-preview

# Or switch to Claude
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your-key-here
CLAUDE_MODEL=claude-sonnet-4-20250514
```

Restart the development server after changing providers.

## Development Status

**Completed:**
- [x] Foundation: Next.js 14, SQLite, shadcn/ui components
- [x] Multi-Exam Architecture: Support for multiple AWS certifications
- [x] SAP-C02 Content: Study content and assessments for all 4 domains
- [x] MLA-C01 Content: Study content and assessments for all 4 domains
- [x] Progress Tracking: Mastery scores, weak area identification
- [x] AI Tutor: Context-aware tutoring with Claude API
- [x] Multi-Provider Support: LLM abstraction supporting Claude and Gemini
- [x] Hands-on Labs: 7 SAP-C02 labs + 12 MLA-C01 labs
- [x] Dark Mode: Theme switcher with system preference detection

**In Progress:**
- [ ] Enhanced progress visualizations
- [ ] Spaced repetition and flashcard system

**Planned:**
- [ ] Additional certifications (DVA-C02, SAA-C03)
- [ ] Exam simulation mode (timed full-length practice tests)
- [ ] Export/import progress data

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

- Study content aligned with official AWS exam guides
- All study materials link to official AWS documentation, whitepapers, and FAQs
- AI tutoring powered by [Anthropic's Claude](https://www.anthropic.com/) or [Google Gemini](https://ai.google.dev/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Infrastructure as Code with [AWS CDK](https://aws.amazon.com/cdk/)
- Charts and visualizations with [Recharts](https://recharts.org/)

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Review official [AWS certification guides](https://aws.amazon.com/certification/)
- Check the [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/) for best practices
- Explore [AWS Whitepapers](https://aws.amazon.com/whitepapers/) for in-depth technical content

---

**Note**: This is a study tool and not affiliated with AWS or Amazon. For official AWS certification information, visit [aws.amazon.com/certification](https://aws.amazon.com/certification/).
