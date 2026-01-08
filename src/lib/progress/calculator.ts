import { db } from "@/lib/db/client";
import { getAllDomains } from "@/lib/content/loader";

export interface WeakAreaDetail {
  topicId: string;
  serviceConcept: string;
}

export interface DomainProgress {
  domainId: string;
  domainName: string;
  weight: number;
  masteryScore: number;
  topicsCompleted: number;
  totalTopics: number;
  weakAreas: WeakAreaDetail[];
  questionsAttempted: number;
  questionsCorrect: number;
}

export interface OverallProgress {
  masteryScore: number;
  questionsAttempted: number;
  questionsCorrect: number;
  studyTimeMinutes: number;
  experimentsCompleted: number;
}

export interface RecentActivity {
  type: string;
  description: string;
  timestamp: string;
}

export interface ReadinessEstimate {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  recommendation: string;
}

export interface ProgressSummary {
  overall: OverallProgress;
  domains: DomainProgress[];
  recentActivity: RecentActivity[];
  readinessEstimate: ReadinessEstimate;
}

/**
 * Calculate mastery score for a domain based on topic progress
 */
export function calculateDomainMastery(domainId: string): number {
  const result = db.prepare(`
    SELECT
      AVG(mastery_level) as avg_mastery
    FROM topic_progress
    WHERE domain_id = ?
  `).get(domainId) as { avg_mastery: number | null };

  return result.avg_mastery ? result.avg_mastery * 100 : 0;
}

/**
 * Calculate overall mastery score weighted by domain exam weights
 */
export function calculateOverallMastery(): number {
  const domains = getAllDomains();
  let weightedSum = 0;
  let totalWeight = 0;

  for (const domain of domains) {
    const mastery = calculateDomainMastery(domain.meta.id);
    weightedSum += mastery * (domain.meta.weight / 100);
    totalWeight += domain.meta.weight / 100;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Get domain progress details
 */
export function getDomainProgress(domainId: string): DomainProgress | null {
  const domains = getAllDomains();
  const domain = domains.find(d => d.meta.id === domainId);

  if (!domain) return null;

  // Get topic progress
  const topicStats = db.prepare(`
    SELECT
      COUNT(*) as topics_with_progress,
      SUM(CASE WHEN mastery_level >= 0.85 THEN 1 ELSE 0 END) as completed_topics
    FROM topic_progress
    WHERE domain_id = ?
  `).get(domainId) as { topics_with_progress: number; completed_topics: number };

  // Get question stats
  const questionStats = db.prepare(`
    SELECT
      COUNT(*) as attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM question_attempts
    WHERE domain_id = ?
  `).get(domainId) as { attempted: number; correct: number };

  // Get weak areas
  const weakAreas = db.prepare(`
    SELECT DISTINCT topic_id, service_or_concept
    FROM weak_areas
    WHERE domain_id = ? AND resolved_at IS NULL
    ORDER BY identified_at DESC
    LIMIT 5
  `).all(domainId) as Array<{ topic_id: string; service_or_concept: string }>;

  return {
    domainId: domain.meta.id,
    domainName: domain.meta.shortName,
    weight: domain.meta.weight,
    masteryScore: calculateDomainMastery(domainId),
    topicsCompleted: topicStats.completed_topics || 0,
    totalTopics: domain.topics.length,
    weakAreas: weakAreas.map(w => ({ topicId: w.topic_id, serviceConcept: w.service_or_concept })),
    questionsAttempted: questionStats.attempted || 0,
    questionsCorrect: questionStats.correct || 0,
  };
}

/**
 * Get overall progress statistics
 */
export function getOverallProgress(): OverallProgress {
  const questionStats = db.prepare(`
    SELECT
      COUNT(*) as attempted,
      SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct
    FROM question_attempts
  `).get() as { attempted: number; correct: number };

  const studyTime = db.prepare(`
    SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
    FROM study_sessions
  `).get() as { total_seconds: number };

  // Experiments are now managed manually (no longer tracked in database)
  const experimentsCompleted = 0;

  return {
    masteryScore: calculateOverallMastery(),
    questionsAttempted: questionStats.attempted || 0,
    questionsCorrect: questionStats.correct || 0,
    studyTimeMinutes: Math.round((studyTime.total_seconds || 0) / 60),
    experimentsCompleted,
  };
}

/**
 * Get recent activity
 */
export function getRecentActivity(limit: number = 10): RecentActivity[] {
  const activities: RecentActivity[] = [];

  // Get recent assessments
  const assessments = db.prepare(`
    SELECT
      domain_id,
      session_type,
      score_percentage,
      completed_at
    FROM assessment_sessions
    ORDER BY completed_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    domain_id: string | null;
    session_type: string;
    score_percentage: number;
    completed_at: string;
  }>;

  for (const assessment of assessments) {
    activities.push({
      type: 'assessment',
      description: assessment.domain_id
        ? `Completed ${assessment.domain_id} assessment (${Math.round(assessment.score_percentage)}%)`
        : `Completed full practice exam (${Math.round(assessment.score_percentage)}%)`,
      timestamp: assessment.completed_at,
    });
  }

  // Get recent study sessions
  const sessions = db.prepare(`
    SELECT
      domain_id,
      topic_id,
      activity_type,
      ended_at
    FROM study_sessions
    ORDER BY ended_at DESC
    LIMIT ?
  `).all(limit) as Array<{
    domain_id: string | null;
    topic_id: string | null;
    activity_type: string;
    ended_at: string;
  }>;

  for (const session of sessions) {
    activities.push({
      type: session.activity_type,
      description: session.topic_id
        ? `Studied ${session.topic_id}`
        : session.domain_id
        ? `Studied ${session.domain_id}`
        : 'Study session',
      timestamp: session.ended_at,
    });
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Calculate exam readiness estimate
 */
export function getReadinessEstimate(): ReadinessEstimate {
  const overall = getOverallProgress();
  const domains = getAllDomains();

  // Check if user has attempted enough questions
  const minQuestionsPerDomain = 10;
  const totalMinQuestions = domains.length * minQuestionsPerDomain;

  if (overall.questionsAttempted < totalMinQuestions) {
    return {
      score: 0,
      confidence: 'low',
      recommendation: `Complete more assessments (${overall.questionsAttempted}/${totalMinQuestions} questions attempted)`,
    };
  }

  const masteryScore = overall.masteryScore;

  // Estimate exam score based on mastery
  // SAP-C02 passing score is ~750/1000 (75%)
  const estimatedScore = Math.round(masteryScore * 10); // Convert to 0-1000 scale

  let confidence: 'low' | 'medium' | 'high';
  let recommendation: string;

  if (masteryScore >= 85) {
    confidence = 'high';
    recommendation = 'You\'re ready! Consider scheduling your exam.';
  } else if (masteryScore >= 75) {
    confidence = 'medium';
    recommendation = 'Close to ready. Review weak areas and take more practice exams.';
  } else if (masteryScore >= 60) {
    confidence = 'medium';
    recommendation = 'Continue studying. Focus on weak domains and complete more assessments.';
  } else {
    confidence = 'low';
    recommendation = 'More preparation needed. Complete assessments for all domains and review fundamentals.';
  }

  return {
    score: estimatedScore,
    confidence,
    recommendation,
  };
}

/**
 * Get complete progress summary
 */
export function getProgressSummary(): ProgressSummary {
  const domains = getAllDomains();

  return {
    overall: getOverallProgress(),
    domains: domains.map(d => getDomainProgress(d.meta.id)).filter(Boolean) as DomainProgress[],
    recentActivity: getRecentActivity(10),
    readinessEstimate: getReadinessEstimate(),
  };
}
