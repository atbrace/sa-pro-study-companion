import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDomainById, getTopicById } from '@/lib/content/loader';
import { parseTopicSections, getSectionBySlug, getAdjacentSections } from '@/lib/content/parser';
import { SectionNavigation } from '@/components/study/SectionNavigation';
import { SectionContent } from '@/components/study/SectionContent';
import { QuestionSection } from '@/components/study/QuestionSection';

interface PageProps {
  params: Promise<{
    domain: string;
    topic: string;
    section?: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain: domainId, topic: topicId, section } = await params;
  const topic = getTopicById(domainId, topicId);

  if (!topic) {
    return {};
  }

  let title = topic.meta.name;

  // Add section title if we're on a specific section
  if (section && section[0] && section[0] !== 'overview') {
    if (section[0] === 'questions') {
      title = `Practice Questions - ${topic.meta.name}`;
    } else if (topic.content) {
      const parsed = parseTopicSections(topic.content.content);
      const currentSection = getSectionBySlug(parsed, section[0]);
      if (currentSection) {
        title = `${currentSection.title} - ${topic.meta.name}`;
      }
    }
  }

  return {
    title: `${title} | SAP-C02 Study Guide`,
    description: topic.meta.description,
  };
}

export default async function TopicSectionPage({ params }: PageProps) {
  const { domain: domainId, topic: topicId, section } = await params;

  // Load domain and topic
  const domain = getDomainById(domainId);
  if (!domain) {
    notFound();
  }

  const topic = getTopicById(domainId, topicId);
  if (!topic) {
    notFound();
  }

  // Find previous and next topics for navigation
  const topicIndex = domain.topics.findIndex(t => t.meta.id === topicId);
  const prevTopic = topicIndex > 0 ? domain.topics[topicIndex - 1] : null;
  const nextTopic = topicIndex < domain.topics.length - 1 ? domain.topics[topicIndex + 1] : null;

  // If no content, show empty state
  if (!topic.content) {
    return (
      <div className="container py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/study" className="hover:text-foreground">
            Study
          </Link>
          <span>/</span>
          <Link href={`/study/${domainId}`} className="hover:text-foreground">
            {domain.meta.shortName}
          </Link>
          <span>/</span>
          <span className="text-foreground">{topic.meta.shortName}</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">{topic.meta.difficulty}</Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              ~{topic.meta.estimatedStudyTime} min
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {topic.meta.name}
          </h1>
          <p className="text-muted-foreground">{topic.meta.description}</p>
        </div>

        <Card className="mb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Content for this topic is being prepared.</p>
          </CardContent>
        </Card>

        {/* Topic Navigation */}
        <div className="flex items-center justify-between pt-8 border-t">
          {prevTopic ? (
            <Button variant="outline" asChild>
              <Link href={`/study/${domainId}/${prevTopic.meta.id}`}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                {prevTopic.meta.shortName}
              </Link>
            </Button>
          ) : (
            <div />
          )}

          <Button variant="outline" asChild>
            <Link href={`/study/${domainId}`}>
              Back to Domain
            </Link>
          </Button>

          {nextTopic ? (
            <Button variant="outline" asChild>
              <Link href={`/study/${domainId}/${nextTopic.meta.id}`}>
                {nextTopic.meta.shortName}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div />
          )}
        </div>
      </div>
    );
  }

  // Parse sections from markdown
  const parsed = parseTopicSections(topic.content.content);

  // Get current section slug
  const currentSlug = section?.[0] || null;

  // No section specified - redirect to first section
  if (!currentSlug) {
    const firstSection = parsed.allSections[0];
    if (firstSection) {
      redirect(`/study/${domainId}/${topicId}/${firstSection.id}`);
    } else {
      notFound();
    }
  }

  // Special case: questions section
  if (currentSlug === 'questions') {
    // Build section list for tabs
    const allSections = [
      ...parsed.allSections.map(s => ({ id: s.id, title: s.title })),
      { id: 'questions', title: 'Practice Questions' },
    ];

    // Get adjacent sections for navigation
    const questionIndex = allSections.length - 1;
    const prevSection = questionIndex > 0 ? allSections[questionIndex - 1] : null;
    const firstSection = parsed.allSections[0];

    return (
      <div className="container py-8 max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/study" className="hover:text-foreground">
            Study
          </Link>
          <span>/</span>
          <Link href={`/study/${domainId}`} className="hover:text-foreground">
            {domain.meta.shortName}
          </Link>
          <span>/</span>
          <Link href={`/study/${domainId}/${topicId}${firstSection ? `/${firstSection.id}` : ''}`} className="hover:text-foreground">
            {topic.meta.shortName}
          </Link>
          <span>/</span>
          <span className="text-foreground">Practice Questions</span>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="capitalize">{topic.meta.difficulty}</Badge>
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              ~{topic.meta.estimatedStudyTime} min
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-4">
            {topic.meta.name}
          </h1>
          <p className="text-muted-foreground">{topic.meta.description}</p>
        </div>

        {/* Questions Section */}
        <QuestionSection topic={topic} domainId={domainId} topicId={topicId} />

        {/* Section Navigation */}
        <SectionNavigation
          prevSection={prevSection}
          nextSection={null}
          domainId={domainId}
          topicId={topicId}
        />

        {/* Topic Navigation */}
        <div className="flex items-center justify-between pt-8 border-t">
          {prevTopic ? (
            <Button variant="outline" asChild>
              <Link href={`/study/${domainId}/${prevTopic.meta.id}`}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                {prevTopic.meta.shortName}
              </Link>
            </Button>
          ) : (
            <div />
          )}

          <Button variant="outline" asChild>
            <Link href={`/study/${domainId}`}>
              Back to Domain
            </Link>
          </Button>

          {nextTopic ? (
            <Button variant="outline" asChild>
              <Link href={`/study/${domainId}/${nextTopic.meta.id}`}>
                {nextTopic.meta.shortName}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <div />
          )}
        </div>
      </div>
    );
  }

  // Find section by slug
  const currentSection = getSectionBySlug(parsed, currentSlug);
  if (!currentSection) {
    notFound();
  }

  // Build section list for tabs (including questions if available)
  const allSections = [
    ...parsed.allSections.map(s => ({ id: s.id, title: s.title })),
  ];
  if (topic.questions.length > 0) {
    allSections.push({ id: 'questions', title: 'Practice Questions' });
  }

  // Get adjacent sections for navigation
  const { prev: prevSection, next: nextContentSection } = getAdjacentSections(parsed, currentSlug);
  const nextSection = nextContentSection || (topic.questions.length > 0 ? { id: 'questions', title: 'Practice Questions' } : null);
  const firstSection = parsed.allSections[0];

  return (
    <div className="container py-8 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/study" className="hover:text-foreground">
          Study
        </Link>
        <span>/</span>
        <Link href={`/study/${domainId}`} className="hover:text-foreground">
          {domain.meta.shortName}
        </Link>
        <span>/</span>
        <Link href={`/study/${domainId}/${topicId}${firstSection ? `/${firstSection.id}` : ''}`} className="hover:text-foreground">
          {topic.meta.shortName}
        </Link>
        <span>/</span>
        <span className="text-foreground">{currentSection.title}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="capitalize">{topic.meta.difficulty}</Badge>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            ~{topic.meta.estimatedStudyTime} min
          </Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {topic.meta.name}
        </h1>
        <p className="text-muted-foreground">{topic.meta.description}</p>
      </div>

      {/* Section Content */}
      <SectionContent
        section={currentSection}
        topic={topic}
        isOverview={currentSection.id === firstSection?.id}
        domainId={domainId}
        domainName={domain.meta.name}
      />

      {/* Section Navigation */}
      <SectionNavigation
        prevSection={prevSection}
        nextSection={nextSection}
        domainId={domainId}
        topicId={topicId}
      />

      {/* Topic Navigation */}
      <div className="flex items-center justify-between pt-8 border-t">
        {prevTopic ? (
          <Button variant="outline" asChild>
            <Link href={`/study/${domainId}/${prevTopic.meta.id}`}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              {prevTopic.meta.shortName}
            </Link>
          </Button>
        ) : (
          <div />
        )}

        <Button variant="outline" asChild>
          <Link href={`/study/${domainId}`}>
            Back to Domain
          </Link>
        </Button>

        {nextTopic ? (
          <Button variant="outline" asChild>
            <Link href={`/study/${domainId}/${nextTopic.meta.id}`}>
              {nextTopic.meta.shortName}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
