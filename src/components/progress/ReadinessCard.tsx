'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ProgressIndicator } from '@/components/ui/progress-indicator';
import type { ReadinessEstimate, DomainReadiness } from '@/lib/progress/calculator';
import { clsx } from 'clsx';

interface ReadinessCardProps {
  estimate: ReadinessEstimate;
  examId: string;
}

const LEVEL_CONFIG = {
  ready: { label: 'Ready', color: 'text-green-600', bg: 'bg-green-50', ring: 'stroke-green-500' },
  approaching: { label: 'Approaching', color: 'text-amber-600', bg: 'bg-amber-50', ring: 'stroke-amber-500' },
  building: { label: 'Building', color: 'text-red-600', bg: 'bg-red-50', ring: 'stroke-red-500' },
} as const;

export function ReadinessCard({ estimate, examId }: ReadinessCardProps) {
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  if (estimate.totalAttempts < 5) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <p className="text-muted-foreground">
          Complete a few assessments to see your readiness estimate.
        </p>
        <a
          href={`/${examId}/assess`}
          className="mt-2 inline-block text-sm text-primary hover:underline"
        >
          Start an assessment
        </a>
      </div>
    );
  }

  const config = LEVEL_CONFIG[estimate.level] ?? LEVEL_CONFIG['building'];
  const mastery = isNaN(estimate.overallMastery) ? 0 : estimate.overallMastery;
  const gaugePercent = Math.min(mastery, 100);
  const circumference = 2 * Math.PI * 15.5;
  const strokeDasharray = `${(gaugePercent / 100) * circumference} ${circumference}`;

  return (
    <div className="rounded-lg border p-6">
      {/* Gauge */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative h-[120px] w-[120px]">
          <svg viewBox="0 0 36 36" className="h-[120px] w-[120px] -rotate-90">
            <circle
              cx="18" cy="18" r="15.5"
              fill="none" stroke="currentColor"
              className="text-muted/30" strokeWidth="2.5"
            />
            <circle
              cx="18" cy="18" r="15.5"
              fill="none" className={config.ring} strokeWidth="2.5"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={clsx('text-3xl font-bold', config.color)}>
              {estimate.score}
            </span>
            <span className="text-xs text-muted-foreground">/ 1000</span>
          </div>
        </div>
        <span className={clsx(
          'mt-2 rounded-full px-3 py-0.5 text-sm font-semibold',
          config.color, config.bg
        )}>
          {config.label}
        </span>
      </div>

      {/* Domain bars */}
      <div className="space-y-3">
        {estimate.domainBreakdown.map(domain => (
          <DomainBar key={domain.domainId} domain={domain} />
        ))}
      </div>

      {/* Top focus */}
      {estimate.focusAreas.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-sm text-foreground">
            <span className="font-medium">Top focus: </span>
            {estimate.focusAreas[0].domainName}
            {' '}({Math.round(estimate.focusAreas[0].mastery)}% mastery, {estimate.focusAreas[0].weight}% weight)
          </p>
        </div>
      )}

      {/* Methodology */}
      <Collapsible open={methodologyOpen} onOpenChange={setMethodologyOpen}>
        <CollapsibleTrigger className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <Info className="h-3 w-3" />
          <span>How is this calculated?</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            Your readiness score is weighted by exam domain importance ({estimate.domainBreakdown.map(d => `${d.weight}%`).join('/')}).
            Mastery is based on your most recent 20 attempts per topic, with conservative adjustment for small sample sizes.
            Topics you haven&apos;t studied yet count as 0% — breadth matters as much as depth.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function DomainBar({ domain }: { domain: DomainReadiness }) {
  const [expanded, setExpanded] = useState(false);
  const masteryRounded = Math.round(domain.mastery);
  const colorClass = masteryRounded >= 85 ? 'text-green-600' : masteryRounded >= 60 ? 'text-amber-600' : 'text-red-600';
  const hasWeakTopics = domain.weakTopics.length > 0;

  return (
    <div>
      <button
        onClick={() => hasWeakTopics && setExpanded(!expanded)}
        className={clsx(
          'w-full text-left',
          hasWeakTopics && 'cursor-pointer'
        )}
      >
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="flex items-center gap-1 text-foreground">
            {hasWeakTopics && (
              expanded
                ? <ChevronDown className="h-3 w-3" />
                : <ChevronRight className="h-3 w-3" />
            )}
            {domain.domainName} ({domain.weight}%)
          </span>
          <span className={colorClass}>{masteryRounded}%</span>
        </div>
        <ProgressIndicator value={masteryRounded} className="h-1.5 rounded-full" />
      </button>

      {expanded && (
        <div className="mt-1.5 ml-4 space-y-1">
          {domain.weakTopics.map(topic => (
            <div key={topic.topicId} className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate">{topic.topicName}</span>
              <span className="flex-shrink-0 ml-2">
                {Math.round(topic.mastery)}%
                <span className="text-muted-foreground/60 ml-1">({topic.attempts} att.)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
