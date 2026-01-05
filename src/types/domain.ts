// Content type definitions based on CONTENT.md specification

export interface AwsDocLink {
  title: string;
  url: string;
  type: 'doc' | 'whitepaper' | 'faq' | 'blog' | 'console';
}

export interface ExamTask {
  id: string;
  name: string;
  description: string;
}

export interface DomainMeta {
  id: string;
  name: string;
  shortName: string;
  weight: number;
  description: string;
  color: string;
  icon: string;
  examTasks: ExamTask[];
  topics: string[];
  keyServices: string[];
  awsDocLinks: AwsDocLink[];
}

export interface TopicMeta {
  id: string;
  name: string;
  shortName: string;
  examTask: string;
  description: string;
  estimatedStudyTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  keyServices: string[];
  keyConcepts: string[];
  awsDocLinks: AwsDocLink[];
  relatedExperiments: string[];
}

export interface TopicContent {
  frontmatter: {
    title: string;
    lastUpdated: string;
  };
  content: string;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  type: 'single' | 'multi';
  correctCount?: number;
  text: string;
  options: QuestionOption[];
  correctAnswer: string | string[];
  explanation: string;
  awsDocLink?: string;
  services: string[];
  concepts: string[];
}

export interface QuestionsData {
  questions: Question[];
}

// Composite types for loaded content
export interface Topic {
  meta: TopicMeta;
  content: TopicContent | null;
  questions: Question[];
}

export interface Domain {
  meta: DomainMeta;
  overview: TopicContent | null;
  topics: Topic[];
}
