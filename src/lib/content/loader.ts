import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import matter from 'gray-matter';
import type {
  Domain,
  DomainMeta,
  Topic,
  TopicMeta,
  TopicContent,
  QuestionsData,
  Question,
} from '@/types/domain';
import { getExamContentDir } from './exam-loader';

/**
 * Get all available domains for an exam
 */
export function getAllDomains(examId: string): Domain[] {
  const contentDir = getExamContentDir(examId);

  if (!fs.existsSync(contentDir)) {
    console.warn('Content directory does not exist:', contentDir);
    return [];
  }

  const domainDirs = fs.readdirSync(contentDir);

  return domainDirs
    .filter(dir => {
      const fullPath = path.join(contentDir, dir);
      return fs.statSync(fullPath).isDirectory() && dir.startsWith('domain-');
    })
    .map(dir => getDomainById(examId, dir))
    .filter((d): d is Domain => d !== null)
    .sort((a, b) => a.meta.id.localeCompare(b.meta.id));
}

/**
 * Get a specific domain by ID
 */
export function getDomainById(examId: string, domainId: string): Domain | null {
  const contentDir = getExamContentDir(examId);
  const domainPath = path.join(contentDir, domainId);

  if (!fs.existsSync(domainPath)) {
    console.warn('Domain directory does not exist:', domainPath);
    return null;
  }

  // Load domain metadata
  const metaPath = path.join(domainPath, 'meta.yaml');
  if (!fs.existsSync(metaPath)) {
    console.warn('Domain meta.yaml does not exist:', metaPath);
    return null;
  }

  const meta = yaml.load(fs.readFileSync(metaPath, 'utf8')) as DomainMeta;

  // Load domain overview
  const overviewPath = path.join(domainPath, 'overview.md');
  const overview = fs.existsSync(overviewPath)
    ? loadMarkdownFile(overviewPath)
    : null;

  // Load all topics for this domain
  const topics = getTopicsForDomain(examId, domainId);

  return {
    meta,
    overview,
    topics,
  };
}

/**
 * Get all topics for a domain
 */
export function getTopicsForDomain(examId: string, domainId: string): Topic[] {
  const contentDir = getExamContentDir(examId);
  const topicsPath = path.join(contentDir, domainId, 'topics');

  if (!fs.existsSync(topicsPath)) {
    return [];
  }

  const topicDirs = fs.readdirSync(topicsPath);

  return topicDirs
    .filter(dir => {
      const fullPath = path.join(topicsPath, dir);
      return fs.statSync(fullPath).isDirectory();
    })
    .map(dir => getTopicById(examId, domainId, dir))
    .filter((t): t is Topic => t !== null);
}

/**
 * Get a specific topic by domain and topic ID
 */
export function getTopicById(examId: string, domainId: string, topicId: string): Topic | null {
  const contentDir = getExamContentDir(examId);
  const topicPath = path.join(contentDir, domainId, 'topics', topicId);

  if (!fs.existsSync(topicPath)) {
    return null;
  }

  // Load topic metadata
  const metaPath = path.join(topicPath, 'meta.yaml');
  if (!fs.existsSync(metaPath)) {
    return null;
  }

  const meta = yaml.load(fs.readFileSync(metaPath, 'utf8')) as TopicMeta;

  // Load topic content
  const contentPath = path.join(topicPath, 'content.md');
  const content = fs.existsSync(contentPath)
    ? loadMarkdownFile(contentPath)
    : null;

  // Load questions
  const questions = getTopicQuestions(examId, domainId, topicId);

  return {
    meta,
    content,
    questions,
  };
}

/**
 * Get questions for a specific topic
 * Injects domainId and topicId into each question for tracking purposes
 */
export function getTopicQuestions(examId: string, domainId: string, topicId: string): Question[] {
  const contentDir = getExamContentDir(examId);
  const questionsPath = path.join(
    contentDir,
    domainId,
    'topics',
    topicId,
    'questions.yaml'
  );

  if (!fs.existsSync(questionsPath)) {
    return [];
  }

  const data = yaml.load(fs.readFileSync(questionsPath, 'utf8')) as QuestionsData;

  // Inject domainId and topicId into each question from the file path
  return (data.questions || []).map(q => ({
    ...q,
    domainId,
    topicId,
  }));
}

/**
 * Get a random set of questions for a domain
 */
export function getRandomDomainQuestions(
  examId: string,
  domainId: string,
  count: number
): Question[] {
  const topics = getTopicsForDomain(examId, domainId);
  const allQuestions: Question[] = [];

  topics.forEach(topic => {
    allQuestions.push(...topic.questions);
  });

  // Shuffle and return requested count
  return shuffleArray(allQuestions).slice(0, count);
}

/**
 * Load and parse a Markdown file with frontmatter
 */
function loadMarkdownFile(filePath: string): TopicContent {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContent);

  return {
    frontmatter: data as TopicContent['frontmatter'],
    content,
  };
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Get total question count for a domain
 */
export function getDomainQuestionCount(domain: Domain): number {
  return domain.topics.reduce((sum, t) => sum + t.questions.length, 0);
}

/**
 * Get content statistics for an exam
 */
export function getContentStats(examId: string) {
  const domains = getAllDomains(examId);

  return {
    totalDomains: domains.length,
    totalTopics: domains.reduce((sum, d) => sum + d.topics.length, 0),
    totalQuestions: domains.reduce((sum, d) => sum + getDomainQuestionCount(d), 0),
    domains: domains.map(d => ({
      id: d.meta.id,
      name: d.meta.name,
      topics: d.topics.length,
      questions: getDomainQuestionCount(d),
    })),
  };
}
