'use client';

import { useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronDown, BookOpen, LocateFixed } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import type { SidebarHierarchy, SidebarDomain, SidebarTopic } from '@/types/sidebar';
import { useSidebarState } from '@/hooks/useSidebarState';
import { getDomainColorHex, getMasteryDotColorClass } from '@/lib/utils/colors';
import { clsx } from 'clsx';

interface StudyTreeNavProps {
  hierarchy: SidebarHierarchy;
  examId: string;
  onNavigate?: () => void; // For mobile: close drawer after navigation
}

export function StudyTreeNav({ hierarchy, examId, onNavigate }: StudyTreeNavProps) {
  const pathname = usePathname();
  const activeItemRef = useRef<HTMLAnchorElement | null>(null);
  const setActiveItemRef = useCallback((el: HTMLAnchorElement | null) => {
    activeItemRef.current = el;
  }, []);
  const { isStudyExpanded, expandedDomains, expandedTopics, toggleStudy, toggleDomain, toggleTopic } =
    useSidebarState(pathname || '');

  const isOnStudyPage = (pathname || '').includes(`/${examId}/study/`);
  const showScrollButton = !isStudyExpanded && isOnStudyPage;

  const handleScrollToCurrent = () => {
    // First expand the study section, then scroll after a brief delay for DOM update
    if (!isStudyExpanded) {
      toggleStudy();
    }
    setTimeout(() => {
      activeItemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 150);
  };

  return (
    <Collapsible open={isStudyExpanded} onOpenChange={toggleStudy}>
      <div className="flex items-center">
        <CollapsibleTrigger
          className="flex flex-1 items-center gap-2 rounded-lg p-2 text-base font-medium hover:bg-muted transition-colors"
          aria-label={isStudyExpanded ? "Collapse study content" : "Expand study content"}
        >
          {isStudyExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <BookOpen className="h-5 w-5" />
          <span>Study</span>
        </CollapsibleTrigger>
        {showScrollButton && (
          <button
            onClick={handleScrollToCurrent}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Scroll to current section"
            title="Scroll to current section"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
        )}
      </div>
      <CollapsibleContent className="space-y-1">
        {hierarchy.domains.map(domain => (
          <DomainTreeItem
            key={domain.id}
            domain={domain}
            examId={examId}
            isExpanded={expandedDomains.has(domain.id)}
            onToggle={() => toggleDomain(domain.id)}
            expandedTopics={expandedTopics}
            onToggleTopic={toggleTopic}
            currentPath={pathname || ''}
            onNavigate={onNavigate}
            setActiveItemRef={setActiveItemRef}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DomainTreeItemProps {
  domain: SidebarDomain;
  examId: string;
  isExpanded: boolean;
  onToggle: () => void;
  expandedTopics: Set<string>;
  onToggleTopic: (domainId: string, topicId: string) => void;
  currentPath: string;
  onNavigate?: () => void;
  setActiveItemRef: (el: HTMLAnchorElement | null) => void;
}

function DomainTreeItem({
  domain,
  examId,
  isExpanded,
  onToggle,
  expandedTopics,
  onToggleTopic,
  currentPath,
  onNavigate,
  setActiveItemRef,
}: DomainTreeItemProps) {
  const isOnDomain = currentPath.startsWith(`/${examId}/study/${domain.id}`);
  const progress = domain.progress;
  const masteryScore = progress?.masteryScore ?? 0;
  const domainColorHex = getDomainColorHex(domain.color);

  return (
    <div
      className="pl-4 border-l-2"
      style={{ borderLeftColor: domainColorHex }}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
            isOnDomain && 'bg-primary/10 text-foreground font-semibold',
            !isOnDomain && 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label={isExpanded ? `Collapse ${domain.shortName}` : `Expand ${domain.shortName}`}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate">{domain.shortName}</span>
        </CollapsibleTrigger>
        {masteryScore > 0 && (
          <div className="px-2 pb-1">
            <ProgressIndicator value={masteryScore} className="h-1 rounded-full" />
          </div>
        )}
        <CollapsibleContent className="space-y-0.5 mt-0.5">
          {domain.topics.map(topic => (
            <TopicTreeItem
              key={topic.id}
              topic={topic}
              examId={examId}
              domainId={domain.id}
              isExpanded={expandedTopics.has(`${domain.id}/${topic.id}`)}
              onToggle={() => onToggleTopic(domain.id, topic.id)}
              currentPath={currentPath}
              onNavigate={onNavigate}
              setActiveItemRef={setActiveItemRef}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface TopicTreeItemProps {
  topic: SidebarTopic;
  examId: string;
  domainId: string;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavigate?: () => void;
  setActiveItemRef: (el: HTMLAnchorElement | null) => void;
}

function TopicTreeItem({
  topic,
  examId,
  domainId,
  isExpanded,
  onToggle,
  currentPath,
  onNavigate,
  setActiveItemRef,
}: TopicTreeItemProps) {
  const isOnTopic = currentPath.startsWith(`/${examId}/study/${domainId}/${topic.id}`);
  const progress = topic.progress;
  const masteryScore = progress?.masteryScore ?? 0;

  return (
    <div className="pl-4">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
            isOnTopic && 'bg-primary/10 text-foreground font-semibold',
            !isOnTopic && 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label={isExpanded ? `Collapse ${topic.shortName}` : `Expand ${topic.shortName}`}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
          <span
            className={clsx('h-2 w-2 rounded-full flex-shrink-0', getMasteryDotColorClass(masteryScore))}
            aria-hidden="true"
          />
          <span className="truncate">{topic.shortName}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 mt-0.5">
          {topic.sections.map(section => (
            <SectionLink
              key={section.id}
              section={section}
              examId={examId}
              domainId={domainId}
              topicId={topic.id}
              currentPath={currentPath}
              onNavigate={onNavigate}
              setActiveItemRef={setActiveItemRef}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface SectionLinkProps {
  section: { id: string; title: string };
  examId: string;
  domainId: string;
  topicId: string;
  currentPath: string;
  onNavigate?: () => void;
  setActiveItemRef: (el: HTMLAnchorElement | null) => void;
}

function SectionLink({ section, examId, domainId, topicId, currentPath, onNavigate, setActiveItemRef }: SectionLinkProps) {
  const href = `/${examId}/study/${domainId}/${topicId}/${section.id}`;
  const isActive = currentPath === href;

  return (
    <Link
      href={href}
      ref={isActive ? setActiveItemRef : undefined}
      onClick={onNavigate}
      className={clsx(
        'flex items-center gap-2 rounded-lg px-2 py-1.5 pl-8 text-xs transition-colors',
        isActive && 'bg-primary/10 text-primary border-l-2 border-primary font-medium',
        !isActive && 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <span className="truncate">{section.title}</span>
    </Link>
  );
}
