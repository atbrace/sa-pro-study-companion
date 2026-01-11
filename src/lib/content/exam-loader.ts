import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import type { ExamConfig, ExamSummary, ExamDomainWeight } from '@/types/exam';

const EXAMS_DIR = path.join(process.cwd(), 'content', 'exams');

interface ExamYaml {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  passingScore: number;
  totalScore: number;
  masteryThreshold: number;
  weakAreaThreshold: number;
  resolveThreshold: number;
  domains: ExamDomainWeight[];
  tutorPrompt: string;
}

/**
 * Get all available exams
 */
export function getAllExams(): ExamConfig[] {
  if (!fs.existsSync(EXAMS_DIR)) {
    console.warn('Exams directory does not exist:', EXAMS_DIR);
    return [];
  }

  const examDirs = fs.readdirSync(EXAMS_DIR);

  return examDirs
    .filter(dir => {
      const fullPath = path.join(EXAMS_DIR, dir);
      const examYamlPath = path.join(fullPath, 'exam.yaml');
      return fs.statSync(fullPath).isDirectory() && fs.existsSync(examYamlPath);
    })
    .map(dir => getExamById(dir))
    .filter((e): e is ExamConfig => e !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Get a specific exam by ID
 */
export function getExamById(examId: string): ExamConfig | null {
  const examPath = path.join(EXAMS_DIR, examId);
  const examYamlPath = path.join(examPath, 'exam.yaml');

  if (!fs.existsSync(examYamlPath)) {
    return null;
  }

  try {
    const data = yaml.load(fs.readFileSync(examYamlPath, 'utf8')) as ExamYaml;

    return {
      id: data.id,
      name: data.name,
      shortName: data.shortName,
      description: data.description,
      icon: data.icon,
      color: data.color,
      passingScore: data.passingScore,
      totalScore: data.totalScore,
      masteryThreshold: data.masteryThreshold,
      weakAreaThreshold: data.weakAreaThreshold,
      resolveThreshold: data.resolveThreshold,
      domains: data.domains,
      tutorPrompt: data.tutorPrompt,
    };
  } catch (error) {
    console.error(`Failed to load exam config for ${examId}:`, error);
    return null;
  }
}

/**
 * Validate that an exam ID exists
 */
export function validateExamId(examId: string): boolean {
  const examPath = path.join(EXAMS_DIR, examId, 'exam.yaml');
  return fs.existsSync(examPath);
}

/**
 * Get exam summaries for listing (lighter weight than full config)
 */
export function getExamSummaries(): ExamSummary[] {
  const exams = getAllExams();

  return exams.map(exam => ({
    id: exam.id,
    name: exam.name,
    shortName: exam.shortName,
    description: exam.description,
    icon: exam.icon,
    color: exam.color,
    domainCount: exam.domains.length,
  }));
}

/**
 * Get the content directory path for an exam
 */
export function getExamContentDir(examId: string): string {
  return path.join(EXAMS_DIR, examId, 'domains');
}
