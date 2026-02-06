import { getTutorProgressContext } from '@/lib/progress/tutor-context';
import { getAllDomains, getTopicById, getTopicQuestions } from '@/lib/content/loader';
import { getLabMeta } from '@/lib/content/experiments';
import { db } from '@/lib/db/client';
import type { Question } from '@/types/domain';

/**
 * Handler for get_study_progress tool
 * Returns formatted progress summary for the current exam
 */
export function handleGetStudyProgress(_params: Record<string, unknown>, examId: string): string {
  try {
    return getTutorProgressContext(examId);
  } catch (error) {
    return 'Unable to retrieve study progress at this time.';
  }
}

/**
 * Handler for get_question_details tool
 * Returns full details for a specific question including answer, explanation, and doc link
 */
export function handleGetQuestionDetails(params: Record<string, unknown>, examId: string): string {
  try {
    const questionId = params.questionId as string;
    const domainId = params.domainId as string | undefined;
    const topicId = params.topicId as string | undefined;

    if (!questionId) return 'Error: questionId is required.';

    let question: Question | undefined;

    if (domainId && topicId) {
      // Scoped search
      const questions = getTopicQuestions(examId, domainId, topicId);
      question = questions.find(q => q.id === questionId);
    } else {
      // Broad search across all domains
      const domains = getAllDomains(examId);
      for (const domain of domains) {
        for (const topic of domain.topics) {
          const found = topic.questions.find(q => q.id === questionId);
          if (found) {
            question = found;
            break;
          }
        }
        if (question) break;
      }
    }

    if (!question) return `Question "${questionId}" not found.`;

    return formatQuestionDetails(question);
  } catch (error) {
    return 'Unable to retrieve question details at this time.';
  }
}

/**
 * Handler for search_study_content tool
 * Searches topics by keyword across names, concepts, services, and descriptions
 */
export function handleSearchStudyContent(params: Record<string, unknown>, examId: string): string {
  try {
    const query = (params.query as string || '').toLowerCase().trim();
    if (!query) return 'Error: query is required.';

    const domains = getAllDomains(examId);

    interface SearchResult {
      topicName: string;
      domainName: string;
      topicId: string;
      domainId: string;
      difficulty: string;
      studyTime: number;
      matchField: string;
      score: number;
    }

    const results: SearchResult[] = [];

    for (const domain of domains) {
      for (const topic of domain.topics) {
        const meta = topic.meta;
        let score = 0;
        const matchFields: string[] = [];

        // Name match (highest priority)
        if (meta.name.toLowerCase().includes(query)) {
          score += 40;
          matchFields.push('name');
        }

        // Key concepts match
        if (meta.keyConcepts.some(c => c.toLowerCase().includes(query))) {
          score += 30;
          matchFields.push('keyConcepts');
        }

        // Key services match
        if (meta.keyServices.some(s => s.toLowerCase().includes(query))) {
          score += 20;
          matchFields.push('keyServices');
        }

        // Description match
        if (meta.description.toLowerCase().includes(query)) {
          score += 10;
          matchFields.push('description');
        }

        if (score > 0) {
          results.push({
            topicName: meta.name,
            domainName: domain.meta.name,
            topicId: meta.id,
            domainId: domain.meta.id,
            difficulty: meta.difficulty,
            studyTime: meta.estimatedStudyTime,
            matchField: matchFields.join(', '),
            score,
          });
        }
      }
    }

    if (results.length === 0) return 'No matching topics found for that query.';

    // Sort by score descending, take top 5
    results.sort((a, b) => b.score - a.score);
    const top = results.slice(0, 5);

    const lines: string[] = [];
    lines.push(`## Search Results for "${params.query}"`);
    lines.push('');

    for (const r of top) {
      lines.push(`**${r.topicName}**`);
      lines.push(`- Domain: ${r.domainName}`);
      lines.push(`- Difficulty: ${r.difficulty} | Study time: ${r.studyTime} min`);
      lines.push(`- Matched: ${r.matchField}`);
      lines.push(`- Route: /${examId}/study/${r.domainId}/${r.topicId}`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    return 'Unable to search study content at this time.';
  }
}

/**
 * Handler for get_topic_metadata tool
 * Returns detailed metadata including difficulty, study time, concepts, docs, and labs
 */
export function handleGetTopicMetadata(params: Record<string, unknown>, examId: string): string {
  try {
    const domainId = params.domainId as string;
    const topicId = params.topicId as string;

    if (!domainId || !topicId) return 'Error: domainId and topicId are required.';

    const topic = getTopicById(examId, domainId, topicId);
    if (!topic) return `Topic "${topicId}" not found in domain "${domainId}".`;

    const meta = topic.meta;
    const lines: string[] = [];

    lines.push(`## ${meta.name}`);
    lines.push('');
    lines.push(`- **Difficulty:** ${meta.difficulty}`);
    lines.push(`- **Estimated Study Time:** ${meta.estimatedStudyTime} min`);
    lines.push(`- **Description:** ${meta.description}`);
    lines.push('');

    if (meta.keyConcepts.length > 0) {
      lines.push(`**Key Concepts:** ${meta.keyConcepts.join(', ')}`);
    }

    if (meta.keyServices.length > 0) {
      lines.push(`**Key Services:** ${meta.keyServices.join(', ')}`);
    }

    if (meta.awsDocLinks.length > 0) {
      lines.push('');
      lines.push('**AWS Documentation:**');
      for (const link of meta.awsDocLinks) {
        lines.push(`- [${link.title}](${link.url}) (${link.type})`);
      }
    }

    if (meta.relatedExperiments.length > 0) {
      lines.push('');
      lines.push('**Related Labs:**');
      for (const labId of meta.relatedExperiments) {
        const lab = getLabMeta(labId);
        if (lab) {
          lines.push(`- ${lab.name} (${lab.estimatedCost}, ~${lab.estimatedTime} min)`);
        } else {
          lines.push(`- ${labId}`);
        }
      }
    }

    lines.push('');
    lines.push(`**Route:** /${examId}/study/${domainId}/${topicId}`);

    return lines.join('\n');
  } catch (error) {
    return 'Unable to retrieve topic metadata at this time.';
  }
}

/**
 * Handler for get_assessment_history tool
 * Returns recent assessment results including scores and missed questions
 */
export function handleGetAssessmentHistory(params: Record<string, unknown>, examId: string): string {
  try {
    const domainId = params.domainId as string | undefined;
    const limit = (params.limit as number) || 3;

    let sessions: Array<{
      id: number;
      domain_id: string | null;
      session_type: string;
      total_questions: number;
      correct_answers: number;
      score_percentage: number;
      completed_at: string;
    }>;

    if (domainId) {
      sessions = db.prepare(`
        SELECT id, domain_id, session_type, total_questions, correct_answers,
               score_percentage, completed_at
        FROM assessment_sessions
        WHERE exam_id = ? AND domain_id = ?
        ORDER BY completed_at DESC
        LIMIT ?
      `).all(examId, domainId, limit) as typeof sessions;
    } else {
      sessions = db.prepare(`
        SELECT id, domain_id, session_type, total_questions, correct_answers,
               score_percentage, completed_at
        FROM assessment_sessions
        WHERE exam_id = ?
        ORDER BY completed_at DESC
        LIMIT ?
      `).all(examId, limit) as typeof sessions;
    }

    if (sessions.length === 0) return 'No assessment history found.';

    const lines: string[] = [];
    lines.push('## Recent Assessment History');
    lines.push('');

    for (const session of sessions) {
      const date = new Date(session.completed_at).toLocaleDateString();
      const scope = session.domain_id || 'Full Exam';
      lines.push(`**${scope}** - ${date}`);
      lines.push(`- Score: ${Math.round(session.score_percentage)}% (${session.correct_answers}/${session.total_questions})`);

      // Get missed questions for this session
      const missed = db.prepare(`
        SELECT question_id, domain_id, topic_id
        FROM question_attempts
        WHERE exam_id = ? AND is_correct = 0
          AND attempted_at >= ? AND attempted_at <= datetime(?, '+1 hour')
        ORDER BY attempted_at
      `).all(examId, session.completed_at, session.completed_at) as Array<{
        question_id: string;
        domain_id: string;
        topic_id: string;
      }>;

      if (missed.length > 0) {
        lines.push(`- Missed questions: ${missed.map(m => m.question_id).join(', ')}`);
        const topics = [...new Set(missed.map(m => m.topic_id))];
        lines.push(`- Weak topics: ${topics.join(', ')}`);
      }

      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    return 'Unable to retrieve assessment history at this time.';
  }
}

/**
 * Handler for get_weak_area_questions tool
 * Returns questions with highest miss rate from question_attempts
 */
export function handleGetWeakAreaQuestions(params: Record<string, unknown>, examId: string): string {
  try {
    const domainId = params.domainId as string | undefined;
    const topicId = params.topicId as string | undefined;
    const limit = (params.limit as number) || 10;

    let whereClause = 'exam_id = ?';
    const queryParams: unknown[] = [examId];

    if (domainId) {
      whereClause += ' AND domain_id = ?';
      queryParams.push(domainId);
    }
    if (topicId) {
      whereClause += ' AND topic_id = ?';
      queryParams.push(topicId);
    }

    queryParams.push(limit);

    const results = db.prepare(`
      SELECT
        question_id,
        topic_id,
        COUNT(*) as times_attempted,
        SUM(CASE WHEN is_correct = 0 THEN 1 ELSE 0 END) as times_missed
      FROM question_attempts
      WHERE ${whereClause}
      GROUP BY question_id
      HAVING times_missed > 0
      ORDER BY CAST(times_missed AS REAL) / COUNT(*) DESC
      LIMIT ?
    `).all(...queryParams) as Array<{
      question_id: string;
      topic_id: string;
      times_attempted: number;
      times_missed: number;
    }>;

    if (results.length === 0) return 'No incorrect attempts found. Keep up the great work!';

    const lines: string[] = [];
    lines.push('## Frequently Missed Questions');
    lines.push('');

    for (const r of results) {
      const missRate = Math.round((r.times_missed / r.times_attempted) * 100);
      lines.push(`**${r.question_id}** (${r.topic_id})`);
      lines.push(`- Attempted: ${r.times_attempted} | Missed: ${r.times_missed} | Miss rate: ${missRate}%`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    return 'Unable to retrieve weak area questions at this time.';
  }
}

/**
 * Handler for suggest_next_study_topic tool
 * Returns personalized study recommendations based on progress, weak areas, and domain weights
 */
export function handleSuggestNextStudyTopic(_params: Record<string, unknown>, examId: string): string {
  try {
    const domains = getAllDomains(examId);
    if (domains.length === 0) return 'No study content available.';

    // Get all topic progress
    const progressRows = db.prepare(`
      SELECT domain_id, topic_id, mastery_level, questions_attempted, last_studied_at
      FROM topic_progress
      WHERE exam_id = ?
    `).all(examId) as Array<{
      domain_id: string;
      topic_id: string;
      mastery_level: number;
      questions_attempted: number;
      last_studied_at: string | null;
    }>;

    const progressMap = new Map<string, typeof progressRows[0]>();
    for (const row of progressRows) {
      progressMap.set(`${row.domain_id}:${row.topic_id}`, row);
    }

    // Get weak areas
    const weakRows = db.prepare(`
      SELECT domain_id, topic_id
      FROM weak_areas
      WHERE exam_id = ? AND resolved = 0
    `).all(examId) as Array<{ domain_id: string; topic_id: string }>;

    const weakSet = new Set(weakRows.map(w => `${w.domain_id}:${w.topic_id}`));

    // Calculate max domain weight for scaling
    const maxWeight = Math.max(...domains.map(d => d.meta.weight));

    interface TopicScore {
      topicName: string;
      domainName: string;
      topicId: string;
      domainId: string;
      score: number;
      mastery: number;
      reasons: string[];
    }

    const scored: TopicScore[] = [];
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    for (const domain of domains) {
      const weightMultiplier = 1.0 + 0.3 * (domain.meta.weight / maxWeight);

      for (const topic of domain.topics) {
        const key = `${domain.meta.id}:${topic.meta.id}`;
        const progress = progressMap.get(key);
        let baseScore = 0;
        const reasons: string[] = [];
        let mastery = 0;

        if (!progress || progress.questions_attempted === 0) {
          // Never studied
          baseScore += 50;
          reasons.push('Never studied');
        } else {
          mastery = progress.mastery_level * 100;

          if (weakSet.has(key)) {
            baseScore += 40;
            reasons.push('Weak area');
          }

          if (mastery < 60) {
            baseScore += 30;
            reasons.push('Low mastery');
          }

          if (progress.last_studied_at) {
            const lastStudied = new Date(progress.last_studied_at).getTime();
            if (now - lastStudied > sevenDaysMs) {
              baseScore += 10;
              reasons.push('Not studied recently');
            }
          }
        }

        // Skip mastered topics
        if (mastery >= 85) continue;

        const finalScore = Math.round(baseScore * weightMultiplier);

        if (finalScore > 0) {
          scored.push({
            topicName: topic.meta.name,
            domainName: domain.meta.name,
            topicId: topic.meta.id,
            domainId: domain.meta.id,
            score: finalScore,
            mastery,
            reasons,
          });
        }
      }
    }

    if (scored.length === 0) {
      return 'All topics mastered! Consider taking a full practice exam to validate your readiness.';
    }

    // Sort by score descending, take top 3
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);

    const lines: string[] = [];
    lines.push('## Recommended Study Topics');
    lines.push('');

    for (let i = 0; i < top.length; i++) {
      const t = top[i];
      lines.push(`**${i + 1}. ${t.topicName}**`);
      lines.push(`- Domain: ${t.domainName}`);
      lines.push(`- Current mastery: ${Math.round(t.mastery)}%`);
      lines.push(`- Why: ${t.reasons.join(', ')}`);
      lines.push(`- Route: /${examId}/study/${t.domainId}/${t.topicId}`);
      lines.push('');
    }

    return lines.join('\n');
  } catch (error) {
    return 'Unable to generate study recommendations at this time.';
  }
}

// --- Private helpers ---

function formatQuestionDetails(q: Question): string {
  const lines: string[] = [];

  lines.push(`## Question: ${q.id}`);
  if (q.type === 'multi' && q.correctCount) {
    lines.push(`*(Select ${q.correctCount})*`);
  }
  lines.push('');
  lines.push(q.text);
  lines.push('');

  lines.push('**Options:**');
  for (const opt of q.options) {
    lines.push(`- **${opt.id}.** ${opt.text}`);
  }
  lines.push('');

  const answer = Array.isArray(q.correctAnswer)
    ? q.correctAnswer.join(', ')
    : q.correctAnswer;
  lines.push(`**Correct Answer:** ${answer}`);
  lines.push('');

  lines.push('**Explanation:**');
  lines.push(q.explanation);

  if (q.awsDocLink) {
    lines.push('');
    lines.push(`**AWS Documentation:** ${q.awsDocLink}`);
  }

  if (q.services.length > 0) {
    lines.push('');
    lines.push(`**Services:** ${q.services.join(', ')}`);
  }

  return lines.join('\n');
}
