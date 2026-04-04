import { getProgressSummary } from './calculator';
import { getTopicById } from '@/lib/content/loader';

/**
 * Get formatted progress context for the tutor tool response
 * This is called when Claude uses the get_study_progress tool
 */
export function getTutorProgressContext(examId: string): string {
  const summary = getProgressSummary(examId);
  const lines: string[] = [];

  // Overall stats
  const overallMastery = Math.round(summary.overall.masteryScore);
  const accuracy =
    summary.overall.questionsAttempted > 0
      ? Math.round(
          (summary.overall.questionsCorrect / summary.overall.questionsAttempted) * 100
        )
      : 0;

  lines.push('## Student Progress Summary');
  lines.push('');
  lines.push(`**Overall Mastery:** ${overallMastery}%`);
  lines.push(
    `**Questions:** ${summary.overall.questionsCorrect}/${summary.overall.questionsAttempted} correct (${accuracy}% accuracy)`
  );
  lines.push(
    `**Exam Readiness:** ${summary.readinessEstimate.score}/1000 (${summary.readinessEstimate.level})`
  );
  lines.push('');

  // Domain breakdown
  lines.push('### Domain Breakdown');
  lines.push('');

  for (const domain of summary.domains) {
    const mastery = Math.round(domain.masteryScore);
    lines.push(
      `**${domain.domainName}** (${domain.weight}% of exam): ${mastery}% mastery`
    );
    lines.push(
      `  - Topics completed: ${domain.topicsCompleted}/${domain.totalTopics}`
    );
    lines.push(
      `  - Questions: ${domain.questionsCorrect}/${domain.questionsAttempted}`
    );

    if (domain.weakAreas.length > 0) {
      const weakTopicNames = domain.weakAreas
        .map((w) => {
          const topic = getTopicById(examId, domain.domainId, w.topicId);
          return topic?.meta.name || w.topicId;
        })
        .join(', ');
      lines.push(`  - Weak areas: ${weakTopicNames}`);
    }

    lines.push('');
  }

  // Recent activity (last 5)
  if (summary.recentActivity.length > 0) {
    lines.push('### Recent Activity');
    lines.push('');
    for (const activity of summary.recentActivity.slice(0, 5)) {
      const date = new Date(activity.timestamp).toLocaleDateString();
      lines.push(`- ${activity.description} (${date})`);
    }
  }

  return lines.join('\n');
}
