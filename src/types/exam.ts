/**
 * Exam configuration and types for multi-exam support
 */

export interface ExamConfig {
  id: string;                    // 'sap-c02', 'mla-c01'
  name: string;                  // 'AWS Solutions Architect Professional'
  shortName: string;             // 'SAP-C02'
  passingScore: number;          // 750
  totalScore: number;            // 1000
  masteryThreshold: number;      // 85 - percentage for "mastered"
  weakAreaThreshold: number;     // 60 - below this is a weak area
  resolveThreshold: number;      // 80 - percentage to resolve a weak area
  description: string;
  icon: string;                  // Lucide icon name
  color: string;                 // Tailwind color class
  tutorPrompt: string;           // Exam-specific AI tutor instructions
  domains: ExamDomainWeight[];   // Domain weights for the exam
}

export interface ExamDomainWeight {
  id: string;
  name: string;
  weight: number;  // Percentage weight in the exam
}

export interface ExamSummary {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: string;
  color: string;
  domainCount: number;
}
