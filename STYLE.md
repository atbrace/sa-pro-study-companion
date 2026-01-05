# AWS SAP Study App - Style Guide

## Overview

This guide defines the visual design, formatting, and output standards for the AWS Solutions Architect Professional study application.

---

## Design System

### Color Palette

```css
/* Base colors - use CSS variables via Tailwind */
--background: 0 0% 100%;           /* White */
--foreground: 222.2 84% 4.9%;      /* Near black */
--muted: 210 40% 96%;              /* Light gray */
--muted-foreground: 215.4 16.3% 46.9%;

/* Semantic colors */
--success: 142 76% 36%;            /* Green */
--success-foreground: 355.7 100% 97.3%;
--warning: 38 92% 50%;             /* Amber */
--warning-foreground: 48 96% 89%;
--destructive: 0 84% 60%;          /* Red */
--destructive-foreground: 0 0% 98%;

/* Domain colors - for visual distinction */
--domain-1: 221 83% 53%;           /* Blue - Organizational Complexity */
--domain-2: 142 71% 45%;           /* Green - New Solutions */
--domain-3: 38 92% 50%;            /* Amber - Continuous Improvement */
--domain-4: 280 67% 55%;           /* Purple - Migration */

/* AWS brand colors (for service icons/badges) */
--aws-orange: 30 100% 50%;
--aws-squid-ink: 210 19% 18%;
```

### Typography

```css
/* Font stack */
font-family: 'Inter', system-ui, sans-serif;

/* Scale */
--text-xs: 0.75rem;    /* 12px - Captions, badges */
--text-sm: 0.875rem;   /* 14px - Secondary text */
--text-base: 1rem;     /* 16px - Body text */
--text-lg: 1.125rem;   /* 18px - Lead paragraphs */
--text-xl: 1.25rem;    /* 20px - Section headers */
--text-2xl: 1.5rem;    /* 24px - Page titles */
--text-3xl: 1.875rem;  /* 30px - Hero text */
```

### Spacing Scale

```
4px   (p-1)  - Tight spacing, icon padding
8px   (p-2)  - Compact elements
12px  (p-3)  - Standard inline spacing
16px  (p-4)  - Card padding, form gaps
24px  (p-6)  - Section spacing
32px  (p-8)  - Major section breaks
48px  (p-12) - Page sections
```

---

## Component Styling

### Cards

```tsx
// Standard content card
<Card className="border rounded-lg shadow-sm">
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-semibold">{title}</CardTitle>
    <CardDescription className="text-sm text-muted-foreground">
      {description}
    </CardDescription>
  </CardHeader>
  <CardContent>{children}</CardContent>
</Card>

// Interactive card (hoverable)
<Card className="border rounded-lg shadow-sm transition-all hover:shadow-md hover:border-primary/50 cursor-pointer">
  ...
</Card>

// Status card variants
<Card className="border-l-4 border-l-green-500">  {/* Success */}
<Card className="border-l-4 border-l-amber-500">  {/* Warning */}
<Card className="border-l-4 border-l-red-500">    {/* Error */}
<Card className="border-l-4 border-l-blue-500">   {/* Info */}
```

### Buttons

```tsx
// Primary action
<Button>Start Assessment</Button>

// Secondary action
<Button variant="outline">View Details</Button>

// Destructive action
<Button variant="destructive">Delete Progress</Button>

// Ghost (minimal)
<Button variant="ghost" size="icon"><ChevronRight /></Button>

// With loading state
<Button disabled={isLoading}>
  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  {isLoading ? 'Processing...' : 'Submit'}
</Button>
```

### Progress Indicators

```tsx
// Mastery progress bar
<div className="space-y-1">
  <div className="flex justify-between text-sm">
    <span>Mastery</span>
    <span className="font-medium">{score}%</span>
  </div>
  <Progress 
    value={score} 
    className={cn(
      score >= 85 && 'bg-green-100 [&>div]:bg-green-500',
      score >= 60 && score < 85 && 'bg-amber-100 [&>div]:bg-amber-500',
      score < 60 && 'bg-red-100 [&>div]:bg-red-500',
    )}
  />
</div>

// Domain completion ring
<div className="relative h-20 w-20">
  <svg className="rotate-[-90deg]" viewBox="0 0 36 36">
    <circle
      className="stroke-muted"
      strokeWidth="3"
      fill="none"
      cx="18" cy="18" r="16"
    />
    <circle
      className="stroke-primary transition-all duration-500"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
      cx="18" cy="18" r="16"
      strokeDasharray={`${progress}, 100`}
    />
  </svg>
  <div className="absolute inset-0 flex items-center justify-center">
    <span className="text-lg font-bold">{progress}%</span>
  </div>
</div>
```

---

## Page Layouts

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Navigation | Tutor Toggle                    │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│   Sidebar    │              Main Content                    │
│              │                                              │
│  - Dashboard │  ┌─────────────────────────────────────────┐ │
│  - Study     │  │  Overall Progress Summary               │ │
│  - Assess    │  └─────────────────────────────────────────┘ │
│  - Labs      │                                              │
│  - Progress  │  ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│              │  │ Domain 1 │ │ Domain 2 │ │ Domain 3 │ ... │
│              │  └──────────┘ └──────────┘ └──────────┘     │
│              │                                              │
│              │  ┌─────────────────────────────────────────┐ │
│              │  │  Weak Areas / Recommendations           │ │
│              │  └─────────────────────────────────────────┘ │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

### Study Content Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Domain > Topic                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  # Topic Title                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Key Concepts (collapsible)                          │   │
│  │ - Concept 1                                         │   │
│  │ - Concept 2                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ## Study Content (Markdown rendered)                       │
│                                                             │
│  Prose with inline [AWS Doc Links](url)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📚 Related AWS Documentation                        │   │
│  │ • Service User Guide                    [Open] ↗    │   │
│  │ • Best Practices Whitepaper             [Open] ↗    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🧪 Related Experiments                              │   │
│  │ • Lab: VPC Peering Setup               [Start] →    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [← Previous Topic]                    [Next Topic →]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Assessment Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Assessment: Domain 1 | Question 5/15 | ⏱️ 12:34             │
├─────────────────────────────────────────────────────────────┤
│ Progress: ████████░░░░░░░░ 33%                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  A company needs to design a multi-account strategy that    │
│  allows centralized logging while maintaining account       │
│  isolation. The security team requires...                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ○ A. Use AWS Organizations with SCPs to...          │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ● B. Create a dedicated logging account with...     │   │ ← Selected
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ C. Deploy CloudTrail in each account and...       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ ○ D. Use AWS Control Tower with a custom...         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│                                                             │
│  [← Back]                                    [Next →]       │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Need help? Ask the AI Tutor                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Results Layout (After Assessment)

```
┌─────────────────────────────────────────────────────────────┐
│ Assessment Complete                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ┌───────────────────────────────────┐                   │
│     │            Score                  │                   │
│     │                                   │                   │
│     │           12/15                   │                   │
│     │            80%                    │                   │
│     │                                   │                   │
│     │  ████████████████░░░░             │                   │
│     │                                   │                   │
│     │   ✓ 12 correct  ✗ 3 incorrect    │                   │
│     │   ⏱️ 18 minutes                   │                   │
│     └───────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ Areas to Review                                  │   │
│  │                                                     │   │
│  │ • Multi-account strategies (2 incorrect)           │   │
│  │ • Hybrid DNS configuration (1 incorrect)           │   │
│  │                                                     │   │
│  │ [Study These Topics]                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Question Review:                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Q1 ✓ | Q2 ✓ | Q3 ✗ | Q4 ✓ | Q5 ✓ | ...             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Review Answers]              [Return to Dashboard]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## AI Tutor Panel

### Slide-Out Drawer

```
Main Content                      │ AI Tutor Panel (slide-out)
──────────────────────────────────┼───────────────────────────────
                                  │ ┌─────────────────────────┐
                                  │ │ 🤖 AI Tutor         [×] │
                                  │ ├─────────────────────────┤
                                  │ │ Context: Domain 1 >     │
                                  │ │ Multi-Account Strategy  │
                                  │ ├─────────────────────────┤
                                  │ │                         │
                                  │ │ User: Can you explain   │
                                  │ │ SCPs vs IAM policies?   │
                                  │ │                         │
                                  │ │ ─────────────────────── │
                                  │ │                         │
                                  │ │ 🤖 Great question!      │
                                  │ │                         │
                                  │ │ **SCPs** operate at the │
                                  │ │ organization level...   │
                                  │ │                         │
                                  │ │ **IAM policies** work   │
                                  │ │ at the account level... │
                                  │ │                         │
                                  │ │ 📚 Related docs:        │
                                  │ │ • SCPs User Guide ↗     │
                                  │ │                         │
                                  │ ├─────────────────────────┤
                                  │ │ [Type your question...] │
                                  │ │                    [↵]  │
                                  │ └─────────────────────────┘
```

### Tutor Response Formatting

```markdown
## Claude Response Style

- Use **bold** for key terms and service names
- Use bullet points sparingly, only for distinct items
- Include relevant AWS doc links inline
- End with follow-up question suggestions when appropriate
- Keep responses concise (under 300 words typically)
- Use code blocks for CLI commands or JSON examples

### Example Response:

**Service Control Policies (SCPs)** are permission guardrails that 
apply to an entire AWS Organization or specific OUs. They define 
the *maximum* permissions available—they don't grant permissions, 
only restrict them.

Key differences from IAM policies:

| Aspect | SCPs | IAM Policies |
|--------|------|--------------|
| Scope | Org/OU/Account | User/Role/Group |
| Effect | Permission boundary | Permission grant |
| Override | Cannot override | Can be overridden |

For your exam, remember: SCPs + IAM policies = effective permissions.
An action is allowed only if *both* allow it.

📚 [AWS Organizations SCPs documentation](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)

**Follow-up questions you might have:**
- How do SCPs interact with permission boundaries?
- What's the best practice for SCP strategy?
```

---

## AWS Documentation Links

### Link Component Styling

```tsx
// Inline documentation link
<DocLink 
  href="https://docs.aws.amazon.com/..."
  type="doc"
>
  VPC User Guide
</DocLink>

// Rendered as:
<a 
  href="..." 
  target="_blank" 
  rel="noopener noreferrer"
  className="text-primary hover:underline inline-flex items-center gap-1"
>
  VPC User Guide
  <ExternalLink className="h-3 w-3" />
</a>

// Documentation card (for lists)
<div className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
  <div className="flex items-center gap-3">
    <FileText className="h-5 w-5 text-muted-foreground" />
    <div>
      <p className="font-medium">Amazon VPC User Guide</p>
      <p className="text-sm text-muted-foreground">Official documentation</p>
    </div>
  </div>
  <Button variant="ghost" size="sm" asChild>
    <a href="..." target="_blank">Open ↗</a>
  </Button>
</div>
```

### Link Types and Icons

| Type | Icon | Example URL Pattern |
|------|------|---------------------|
| `doc` | FileText | docs.aws.amazon.com/* |
| `whitepaper` | BookOpen | d1.awsstatic.com/whitepapers/* |
| `faq` | HelpCircle | aws.amazon.com/*/faqs/ |
| `blog` | Newspaper | aws.amazon.com/blogs/* |
| `console` | ExternalLink | console.aws.amazon.com/* |

---

## Question Display Formats

### Single-Select Question

```tsx
<div className="space-y-4">
  <p className="text-lg">{question.text}</p>
  
  <RadioGroup value={selected} onValueChange={setSelected}>
    {question.options.map((option) => (
      <div
        key={option.id}
        className={cn(
          "flex items-start space-x-3 p-4 rounded-lg border transition-colors",
          selected === option.id && "border-primary bg-primary/5",
          showResult && option.id === correctAnswer && "border-green-500 bg-green-50",
          showResult && selected === option.id && option.id !== correctAnswer && "border-red-500 bg-red-50"
        )}
      >
        <RadioGroupItem value={option.id} id={option.id} />
        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
          <span className="font-medium">{option.id}.</span> {option.text}
        </Label>
        {showResult && option.id === correctAnswer && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        {showResult && selected === option.id && option.id !== correctAnswer && (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
    ))}
  </RadioGroup>
</div>
```

### Multi-Select Question

```tsx
<div className="space-y-4">
  <p className="text-lg">{question.text}</p>
  <p className="text-sm text-muted-foreground">
    Select {question.correctCount} answers
  </p>
  
  <div className="space-y-2">
    {question.options.map((option) => (
      <div
        key={option.id}
        className={cn(
          "flex items-start space-x-3 p-4 rounded-lg border",
          selected.includes(option.id) && "border-primary bg-primary/5"
        )}
      >
        <Checkbox
          id={option.id}
          checked={selected.includes(option.id)}
          onCheckedChange={(checked) => handleToggle(option.id, checked)}
        />
        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
          <span className="font-medium">{option.id}.</span> {option.text}
        </Label>
      </div>
    ))}
  </div>
</div>
```

### Explanation Display (After Answer)

```tsx
<div className="mt-6 p-4 rounded-lg bg-muted/50 space-y-3">
  <div className="flex items-center gap-2">
    {isCorrect ? (
      <>
        <CheckCircle className="h-5 w-5 text-green-500" />
        <span className="font-medium text-green-700">Correct!</span>
      </>
    ) : (
      <>
        <XCircle className="h-5 w-5 text-red-500" />
        <span className="font-medium text-red-700">Incorrect</span>
      </>
    )}
  </div>
  
  <div className="prose prose-sm max-w-none">
    <p><strong>Explanation:</strong> {question.explanation}</p>
  </div>
  
  {question.awsDocLink && (
    <div className="pt-2 border-t">
      <DocLink href={question.awsDocLink} type="doc">
        Learn more in AWS documentation
      </DocLink>
    </div>
  )}
</div>
```

---

## Experiment/Lab Styling

### Lab Card (List View)

```tsx
<Card className="overflow-hidden">
  <div className="flex">
    <div className="w-2 bg-domain-1" /> {/* Domain color stripe */}
    <div className="flex-1 p-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">VPC Peering Configuration</h3>
          <p className="text-sm text-muted-foreground">
            Domain 1 • ~30 minutes • Beginner
          </p>
        </div>
        <Badge variant="outline">Not Started</Badge>
      </div>
      <p className="mt-2 text-sm">
        Set up VPC peering between two VPCs and configure route tables
        for cross-VPC communication.
      </p>
      <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Server className="h-4 w-4" />
          2 VPCs
        </span>
        <span className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          ~$0.10/hr
        </span>
      </div>
    </div>
  </div>
</Card>
```

### Deployment Status

```tsx
// Status badge variants
<Badge className="bg-yellow-100 text-yellow-800">Deploying...</Badge>
<Badge className="bg-green-100 text-green-800">Deployed</Badge>
<Badge className="bg-red-100 text-red-800">Failed</Badge>
<Badge className="bg-gray-100 text-gray-800">Not Deployed</Badge>

// Deployed resources list
<div className="space-y-2">
  {resources.map((resource) => (
    <div 
      key={resource.arn} 
      className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
    >
      <div className="flex items-center gap-3">
        <ServiceIcon service={resource.type} className="h-5 w-5" />
        <div>
          <p className="font-medium">{resource.name}</p>
          <p className="text-xs text-muted-foreground font-mono">
            {resource.arn}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild>
        <a href={resource.consoleUrl} target="_blank">
          Open in Console ↗
        </a>
      </Button>
    </div>
  ))}
</div>
```

---

## Responsive Breakpoints

```css
/* Mobile first approach */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */
```

### Layout Adjustments

```tsx
// Sidebar: Hidden on mobile, visible on desktop
<aside className="hidden lg:block w-64 border-r">

// Main content: Full width mobile, with sidebar margin on desktop
<main className="lg:ml-64 p-4 lg:p-8">

// Cards: Stack on mobile, grid on desktop
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

// Tutor panel: Full screen on mobile, slide-out on desktop
<Sheet>
  <SheetContent side="right" className="w-full sm:w-96">
```

---

## Accessibility

- All interactive elements have visible focus states
- Color is never the only indicator (icons + color for status)
- Form inputs have associated labels
- Images have alt text
- Sufficient color contrast (WCAG AA minimum)
- Keyboard navigation for all features
- Screen reader announcements for dynamic content
