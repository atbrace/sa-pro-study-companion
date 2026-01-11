# Content Authoring Guide

This guide explains how to add and structure study content for AWS certification exams.

---

## Directory Structure

```
content/exams/
  [exam-id]/                    # e.g., sap-c02, mla-c01
    exam.yaml                   # Exam configuration
    domains/
      [domain-id]/              # e.g., domain-1-organizational-complexity
        meta.yaml               # Domain metadata
        overview.md             # Domain overview content
        topics/
          [topic-id]/           # e.g., network-connectivity
            meta.yaml           # Topic metadata
            content.md          # Study content (Markdown)
            questions.yaml      # Practice questions

content/experiments/            # Shared across all exams
  [lab-id]/
    README.md                   # Lab guide
    cdk/
      stack.ts                  # CDK infrastructure
```

---

## Adding a New Exam

### Step 1: Create the exam directory

```bash
mkdir -p content/exams/[exam-id]/domains
```

### Step 2: Create exam.yaml

This file configures the exam and provides the AI tutor with exam-specific context.

```yaml
id: exam-id                     # URL-safe identifier (e.g., sap-c02)
name: Full Exam Name            # e.g., AWS Solutions Architect Professional
shortName: EXAM-CODE            # e.g., SAP-C02
description: Brief description of the certification

# Lucide icon name (see https://lucide.dev/icons)
icon: Building2

# Tailwind color for UI accents
color: orange

# Scoring thresholds
passingScore: 750               # AWS passing score
totalScore: 1000                # AWS total score
masteryThreshold: 85            # Percentage to be "exam ready"
weakAreaThreshold: 60           # Below this marks a weak area
resolveThreshold: 80            # Above this resolves a weak area

# Domain weights (must sum to 100)
domains:
  - id: domain-1-example
    name: Domain Name
    weight: 25

# AI tutor system prompt (exam-specific instructions)
tutorPrompt: |
  You are an expert [exam name] tutor...
  [Include exam context, key services, response guidelines]
```

### Step 3: Create domain directories

For each domain listed in `exam.yaml`, create:

```bash
mkdir -p content/exams/[exam-id]/domains/[domain-id]/topics
```

### Step 4: Add domain content

Create `meta.yaml` and `overview.md` for each domain (see formats below).

### Step 5: Add topics

For each topic, create a directory with `meta.yaml`, `content.md`, and `questions.yaml`.

### Step 6: Validate

```bash
pnpm content:validate
```

The app automatically picks up new content - no code changes needed.

---

## File Formats

### Domain meta.yaml

```yaml
id: domain-1-example
name: Full Domain Name
shortName: Short Name           # For sidebar display
weight: 25                      # Exam weight percentage
description: >
  Multi-line description of what this domain covers.

color: blue                     # blue, orange, green, purple, red
icon: building-2                # Lucide icon name

# Exam tasks this domain covers (from official exam guide)
examTasks:
  - id: task-1-1
    name: Task name
    description: >
      What this task involves.

# Topic IDs in display order
topics:
  - topic-id-1
  - topic-id-2

# Key AWS services for this domain
keyServices:
  - Service Name 1
  - Service Name 2

# Official AWS documentation links
awsDocLinks:
  - title: Link Title
    url: https://docs.aws.amazon.com/...
    type: doc                   # doc, whitepaper, or faq
```

### Domain overview.md

Markdown file with domain overview. Supports standard Markdown plus frontmatter:

```markdown
---
title: Domain Overview Title
---

# Domain Name

Overview content here...

## Key Concepts

- Concept 1
- Concept 2

## Exam Tips

Tips for this domain...
```

### Topic meta.yaml

```yaml
id: topic-id
name: Full Topic Name
shortName: Short Name           # For sidebar display
examTask: task-1-1              # Links to domain examTask

description: >
  What this topic covers.

estimatedStudyTime: 90          # Minutes
difficulty: intermediate        # beginner, intermediate, advanced

keyServices:
  - Service 1
  - Service 2

keyConcepts:
  - Concept 1
  - Concept 2

awsDocLinks:
  - title: Link Title
    url: https://docs.aws.amazon.com/...
    type: doc

# Optional: related hands-on labs
relatedExperiments:
  - lab-id-1
```

### Topic content.md

Markdown study content. Use headings to create navigable sections:

```markdown
---
title: Topic Title
---

# Topic Name

Introduction paragraph...

## Section One

Content with **bold** and `code`.

### Subsection

More detailed content...

## Section Two

Additional content...

## Best Practices

- Practice 1
- Practice 2

## Exam Tips

What to focus on for the exam...
```

**Section IDs**: Headings become navigable sections in the sidebar. The app generates IDs from heading text (e.g., "Section One" becomes `section-one`).

### Topic questions.yaml

Practice questions for the topic. Aim for 15+ questions per topic.

```yaml
questions:
  # Single-select question
  - id: unique-id-001           # Unique within the exam
    type: single
    text: >
      Question text here. Can be multi-line.
      Include scenario details and specific requirements.
    options:
      - id: A
        text: First option
      - id: B
        text: Second option
      - id: C
        text: Third option
      - id: D
        text: Fourth option
    correctAnswer: B
    explanation: >
      Explain why B is correct and why other options are wrong.
      Reference specific AWS features or behaviors.
    awsDocLink: https://docs.aws.amazon.com/...
    services:
      - Service Name
    concepts:
      - Concept Name

  # Multi-select question
  - id: unique-id-002
    type: multi
    correctCount: 2             # How many correct answers
    text: >
      Question asking to select TWO answers...
    options:
      - id: A
        text: Option A
      - id: B
        text: Option B
      - id: C
        text: Option C
      - id: D
        text: Option D
      - id: E
        text: Option E
    correctAnswer:
      - A
      - C
    explanation: >
      Explain why A and C are correct...
    awsDocLink: https://docs.aws.amazon.com/...
    services:
      - Service 1
      - Service 2
    concepts:
      - Concept 1
```

---

## Question Writing Guidelines

### Format

- **Scenario-based**: Start with a realistic scenario (company size, requirements, constraints)
- **Clear ask**: End with a specific question ("Which solution...", "What should...")
- **4-5 options**: Single-select uses 4 options, multi-select can use 5
- **Plausible distractors**: Wrong answers should be realistic but clearly incorrect

### Difficulty Levels

- **Easy**: Direct service knowledge, single-service solutions
- **Medium**: Multi-service integration, trade-off analysis
- **Hard**: Complex scenarios, multiple constraints, edge cases

### Explanation Quality

- Explain why the correct answer is right
- Explain why each wrong answer is wrong
- Reference specific AWS features, limits, or behaviors
- Include links to relevant documentation

### ID Conventions

Use a prefix based on the topic:
- `net-001`, `net-002` for network connectivity
- `sec-001`, `sec-002` for security
- `cost-001`, `cost-002` for cost optimization

---

## Experiment Guidelines

### Lab Structure

```
content/experiments/
  lab-name/
    README.md          # Lab guide (Markdown)
    meta.yaml          # Lab metadata
    cdk/
      stack.ts         # Main CDK stack
      package.json     # CDK dependencies
```

### Lab Requirements

1. **Clear learning objectives**
2. **Architecture diagram**
3. **Cost estimate**
4. **Step-by-step instructions**
5. **Cleanup instructions**
6. **Knowledge check questions**

### CDK Standards

- Tag all resources with `sap-study-lab` and `auto-cleanup`
- Use minimal instance sizes (t3.micro, t3.small)
- Provide stack outputs for console links
- Support clean destroy without manual intervention

---

## Validation

Run content validation to check for errors:

```bash
pnpm content:validate
```

This checks:
- Required fields in YAML files
- Valid question format
- Correct answer references valid option IDs
- File structure matches expected layout

View content statistics:

```bash
pnpm content:stats
```

---

## Content Quality Checklist

### Per Topic (15 questions minimum)

- [ ] `meta.yaml` has all required fields
- [ ] `content.md` covers key concepts with clear explanations
- [ ] `content.md` includes AWS documentation links
- [ ] `questions.yaml` has 15+ questions
- [ ] Mix of single-select and multi-select questions
- [ ] All questions have detailed explanations
- [ ] Questions reference official AWS documentation
- [ ] Content validated with `pnpm content:validate`

### Per Domain

- [ ] `meta.yaml` with all required fields
- [ ] `overview.md` with study path
- [ ] All topics completed
- [ ] At least one related experiment

### Per Exam

- [ ] `exam.yaml` with complete configuration
- [ ] All domains have content
- [ ] AI tutor prompt is exam-specific
- [ ] Total questions >= 50 (removes "under construction" banner)

---

## Supported Exams

| Exam ID | Name | Status |
|---------|------|--------|
| `sap-c02` | AWS Solutions Architect Professional | Complete (300 questions) |
| `mla-c01` | AWS Machine Learning Engineer Associate | Scaffold only |

---

## Example: Adding MLA-C01 Content

The MLA-C01 exam scaffold exists. To add content:

1. **Add topics to each domain**:
   ```bash
   mkdir -p content/exams/mla-c01/domains/domain-1-data-preparation/topics/data-ingestion
   ```

2. **Create topic files**:
   - `meta.yaml` - Topic metadata
   - `content.md` - Study material
   - `questions.yaml` - Practice questions

3. **Update domain meta.yaml** to list the new topic:
   ```yaml
   topics:
     - data-ingestion
     - feature-engineering
   ```

4. **Validate**:
   ```bash
   pnpm content:validate
   ```

The app automatically picks up new content - no code changes needed.
