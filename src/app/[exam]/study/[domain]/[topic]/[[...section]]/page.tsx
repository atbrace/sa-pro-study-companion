import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Metadata } from 'next';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import { getDomainById, getTopicById } from '@/lib/content/loader';
import { getExamById } from '@/lib/content/exam-loader';
import { parseTopicSections, getSectionBySlug, getAdjacentSections } from '@/lib/content/parser';
import { SectionNavigation } from '@/components/study/SectionNavigation';
import { SectionContent } from '@/components/study/SectionContent';
import { QuestionSection } from '@/components/study/QuestionSection';
import { TopicBreadcrumb } from '@/components/study/TopicBreadcrumb';
import { TopicHeader } from '@/components/study/TopicHeader';
import { TopicNavigation } from '@/components/study/TopicNavigation';

interface PageProps {
  params: Promise<{
    exam: string;
    domain: string;
    topic: string;
    section?: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { exam: examId, domain: domainId, topic: topicId, section } = await params;
  const examConfig = getExamById(examId);
  const topic = getTopicById(examId, domainId, topicId);

  if (!topic) {
    return {};
  }

  const examName = examConfig?.shortName || examId.toUpperCase();
  let title = topic.meta.name;

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
    title: `${title} | ${examName} Study Guide`,
    description: topic.meta.description,
  };
}

export default async function TopicSectionPage({ params }: PageProps) {
  const { exam: examId, domain: domainId, topic: topicId, section } = await params;
  const examConfig = getExamById(examId);
  const examName = examConfig?.shortName || examId.toUpperCase();

  const domain = getDomainById(examId, domainId);
  if (!domain) {
    notFound();
  }

  const topic = getTopicById(examId, domainId, topicId);
  if (!topic) {
    notFound();
  }

  // Find adjacent topics for navigation
  const topicIndex = domain.topics.findIndex(t => t.meta.id === topicId);
  const prevTopic = topicIndex > 0 ? domain.topics[topicIndex - 1] : null;
  const nextTopic = topicIndex < domain.topics.length - 1 ? domain.topics[topicIndex + 1] : null;

  // Base breadcrumb segments
  const baseBreadcrumbs = [
    { label: 'Study', href: `/${examId}/study` },
    { label: domain.meta.shortName, href: `/${examId}/study/${domainId}` },
  ];

  // If no content, show empty state
  if (!topic.content) {
    return (
      <div className="container py-8 max-w-4xl">
        <TopicBreadcrumb segments={[...baseBreadcrumbs, { label: topic.meta.shortName }]} />
        <TopicHeader meta={topic.meta} />

        <Card className="mb-8">
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Content for this topic is being prepared.</p>
          </CardContent>
        </Card>

        <TopicNavigation
          prevTopic={prevTopic}
          nextTopic={nextTopic}
          examId={examId}
          domainId={domainId}
        />
      </div>
    );
  }

  // Parse sections from markdown
  const parsed = parseTopicSections(topic.content.content);
  const currentSlug = section?.[0] || null;
  const firstSection = parsed.allSections[0];
  const topicHref = `/${examId}/study/${domainId}/${topicId}${firstSection ? `/${firstSection.id}` : ''}`;

  // No section specified - redirect to first section
  if (!currentSlug) {
    if (firstSection) {
      redirect(`/${examId}/study/${domainId}/${topicId}/${firstSection.id}`);
    } else {
      notFound();
    }
  }

  // Special case: questions section
  if (currentSlug === 'questions') {
    const allSections = [
      ...parsed.allSections.map(s => ({ id: s.id, title: s.title })),
      { id: 'questions', title: 'Practice Questions' },
    ];
    const questionIndex = allSections.length - 1;
    const prevSection = questionIndex > 0 ? allSections[questionIndex - 1] : null;

    return (
      <div className="container py-8 max-w-4xl">
        <TopicBreadcrumb segments={[
          ...baseBreadcrumbs,
          { label: topic.meta.shortName, href: topicHref },
          { label: 'Practice Questions' },
        ]} />
        <TopicHeader meta={topic.meta} />

        <QuestionSection topic={topic} examId={examId} examName={examName} domainId={domainId} topicId={topicId} />

        <SectionNavigation
          prevSection={prevSection}
          nextSection={null}
          examId={examId}
          domainId={domainId}
          topicId={topicId}
        />

        <TopicNavigation
          prevTopic={prevTopic}
          nextTopic={nextTopic}
          examId={examId}
          domainId={domainId}
        />
      </div>
    );
  }

  // Find section by slug
  const currentSection = getSectionBySlug(parsed, currentSlug);
  if (!currentSection) {
    notFound();
  }

  // Build section list for tabs
  const allSections = parsed.allSections.map(s => ({ id: s.id, title: s.title }));
  if (topic.questions.length > 0) {
    allSections.push({ id: 'questions', title: 'Practice Questions' });
  }

  // Get adjacent sections for navigation
  const { prev: prevSection, next: nextContentSection } = getAdjacentSections(parsed, currentSlug);
  const nextSection = nextContentSection || (topic.questions.length > 0 ? { id: 'questions', title: 'Practice Questions' } : null);

  return (
    <div className="container py-8 max-w-4xl">
      <TopicBreadcrumb segments={[
        ...baseBreadcrumbs,
        { label: topic.meta.shortName, href: topicHref },
        { label: currentSection.title },
      ]} />
      <TopicHeader meta={topic.meta} />

      <SectionContent
        section={currentSection}
        topic={topic}
        isOverview={currentSection.id === firstSection?.id}
        domainId={domainId}
        domainName={domain.meta.name}
      />

      <SectionNavigation
        prevSection={prevSection}
        nextSection={nextSection}
        examId={examId}
        domainId={domainId}
        topicId={topicId}
      />

      <TopicNavigation
        prevTopic={prevTopic}
        nextTopic={nextTopic}
        examId={examId}
        domainId={domainId}
      />
    </div>
  );
}
