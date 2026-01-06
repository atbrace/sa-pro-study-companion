'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ChevronDown, BookOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { SidebarHierarchy, SidebarDomain, SidebarTopic } from '@/types/sidebar';
import { useSidebarState } from '@/hooks/useSidebarState';
import { clsx } from 'clsx';

interface StudyTreeNavProps {
  hierarchy: SidebarHierarchy;
  onNavigate?: () => void; // For mobile: close drawer after navigation
}

export function StudyTreeNav({ hierarchy, onNavigate }: StudyTreeNavProps) {
  const pathname = usePathname();
  const { isStudyExpanded, expandedDomains, expandedTopics, toggleStudy, toggleDomain, toggleTopic } =
    useSidebarState(pathname || '');

  return (
    <Collapsible open={isStudyExpanded} onOpenChange={toggleStudy}>
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 rounded-lg p-2 text-base font-medium hover:bg-muted transition-colors"
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
      <CollapsibleContent className="space-y-1">
        {hierarchy.domains.map(domain => (
          <DomainTreeItem
            key={domain.id}
            domain={domain}
            isExpanded={expandedDomains.has(domain.id)}
            onToggle={() => toggleDomain(domain.id)}
            expandedTopics={expandedTopics}
            onToggleTopic={toggleTopic}
            currentPath={pathname || ''}
            onNavigate={onNavigate}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

interface DomainTreeItemProps {
  domain: SidebarDomain;
  isExpanded: boolean;
  onToggle: () => void;
  expandedTopics: Set<string>;
  onToggleTopic: (domainId: string, topicId: string) => void;
  currentPath: string;
  onNavigate?: () => void;
}

function DomainTreeItem({
  domain,
  isExpanded,
  onToggle,
  expandedTopics,
  onToggleTopic,
  currentPath,
  onNavigate,
}: DomainTreeItemProps) {
  const isOnDomain = currentPath.startsWith(`/study/${domain.id}`);

  return (
    <div className="pl-4">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
            isOnDomain && 'text-foreground',
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
        <CollapsibleContent className="space-y-0.5 mt-0.5">
          {domain.topics.map(topic => (
            <TopicTreeItem
              key={topic.id}
              topic={topic}
              domainId={domain.id}
              isExpanded={expandedTopics.has(`${domain.id}/${topic.id}`)}
              onToggle={() => onToggleTopic(domain.id, topic.id)}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface TopicTreeItemProps {
  topic: SidebarTopic;
  domainId: string;
  isExpanded: boolean;
  onToggle: () => void;
  currentPath: string;
  onNavigate?: () => void;
}

function TopicTreeItem({
  topic,
  domainId,
  isExpanded,
  onToggle,
  currentPath,
  onNavigate,
}: TopicTreeItemProps) {
  const isOnTopic = currentPath.startsWith(`/study/${domainId}/${topic.id}`);

  return (
    <div className="pl-4">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        <CollapsibleTrigger
          className={clsx(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
            isOnTopic && 'text-foreground',
            !isOnTopic && 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          aria-label={isExpanded ? `Collapse ${topic.shortName}` : `Expand ${topic.shortName}`}
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 flex-shrink-0" />
          )}
          <span className="truncate">{topic.shortName}</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 mt-0.5">
          {topic.sections.map(section => (
            <SectionLink
              key={section.id}
              section={section}
              domainId={domainId}
              topicId={topic.id}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface SectionLinkProps {
  section: { id: string; title: string };
  domainId: string;
  topicId: string;
  currentPath: string;
  onNavigate?: () => void;
}

function SectionLink({ section, domainId, topicId, currentPath, onNavigate }: SectionLinkProps) {
  const href = `/study/${domainId}/${topicId}/${section.id}`;
  const isActive = currentPath === href;

  return (
    <Link
      href={href}
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
