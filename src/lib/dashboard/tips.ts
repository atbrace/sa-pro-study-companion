export interface Tip {
  id: string;
  category: "onboarding" | "assessment" | "study" | "feature" | "exam-prep";
  title: string;
  content: string;
}

const tips: Tip[] = [
  // Onboarding tips - for users with 0 questions attempted
  {
    id: "onboarding-1",
    category: "onboarding",
    title: "Assessment-First Learning",
    content:
      "Start with an assessment to identify your knowledge gaps. The app will track your weak areas and help you focus on what matters most.",
  },
  {
    id: "onboarding-2",
    category: "onboarding",
    title: "Four Exam Domains",
    content:
      "The SAP-C02 exam covers 4 domains with different weights. Focus on higher-weighted domains for maximum impact on your score.",
  },
  {
    id: "onboarding-3",
    category: "onboarding",
    title: "AI Tutor Available",
    content:
      'Click the "AI Tutor" button in the header to get help anytime. The tutor understands your current study context and can answer questions about AWS services.',
  },

  // Assessment tips - for users actively taking assessments
  {
    id: "assessment-1",
    category: "assessment",
    title: "Target 85% Mastery",
    content:
      "Aim for 85% mastery on each domain before scheduling your exam. This gives you a comfortable buffer above the passing score.",
  },
  {
    id: "assessment-2",
    category: "assessment",
    title: "Weak Areas Auto-Detected",
    content:
      "Topics where you score below 60% are automatically flagged as weak areas. They resolve automatically once you reach 80% mastery.",
  },
  {
    id: "assessment-3",
    category: "assessment",
    title: "Review Explanations",
    content:
      "After each question, read the explanation carefully. Understanding why an answer is correct is more valuable than just knowing the answer.",
  },

  // Study tips - for users with weak areas
  {
    id: "study-1",
    category: "study",
    title: "Focus on Weak Areas",
    content:
      'Your Focus Areas section shows topics that need attention. Click "Study" to dive into the content and reinforce your understanding.',
  },
  {
    id: "study-2",
    category: "study",
    title: "Ask the Tutor",
    content:
      'Stuck on a concept? The AI tutor can explain AWS services, compare options, and help you understand architectural patterns. Just ask!',
  },
  {
    id: "study-3",
    category: "study",
    title: "Hands-On Practice",
    content:
      "Check out the Labs section for hands-on experiments with real AWS resources. Practical experience reinforces theoretical knowledge.",
  },

  // Feature tips - general feature highlights
  {
    id: "feature-1",
    category: "feature",
    title: "Context-Aware Tutoring",
    content:
      "The AI tutor knows which page you're on and what question you're viewing. It can provide targeted help based on your current context.",
  },
  {
    id: "feature-2",
    category: "feature",
    title: "Progress Dashboard",
    content:
      'Visit the Progress page for detailed analytics including domain breakdowns, radar charts, and your complete weak areas list.',
  },
  {
    id: "feature-3",
    category: "feature",
    title: "Navigation Help",
    content:
      'Ask the tutor "Where can I learn about [service]?" and it will guide you to the relevant study content with direct links.',
  },

  // Exam prep tips - for users with 75%+ mastery
  {
    id: "exam-prep-1",
    category: "exam-prep",
    title: "Almost There!",
    content:
      "You're making great progress. Focus on any remaining weak areas and consider taking full practice exams to build test-taking stamina.",
  },
  {
    id: "exam-prep-2",
    category: "exam-prep",
    title: "Schedule Strategically",
    content:
      "Once you hit 85% overall mastery, consider scheduling your exam. Having a deadline can help maintain focus and motivation.",
  },
  {
    id: "exam-prep-3",
    category: "exam-prep",
    title: "Review All Domains",
    content:
      "Before your exam, do a quick review of all domains. Even high-mastery topics benefit from a refresher.",
  },
];

export interface UserState {
  questionsAttempted: number;
  masteryScore: number;
  hasWeakAreas: boolean;
}

/**
 * Get the appropriate tip category based on user state
 */
function getTipCategory(state: UserState): Tip["category"] {
  if (state.questionsAttempted === 0) {
    return "onboarding";
  }

  if (state.masteryScore >= 75) {
    return "exam-prep";
  }

  if (state.hasWeakAreas) {
    return "study";
  }

  if (state.questionsAttempted < 40) {
    return "assessment";
  }

  return "feature";
}

/**
 * Select a random tip for the current user based on their state
 */
export function selectRandomTip(state: UserState, excludeId?: string): Tip {
  const category = getTipCategory(state);
  let categoryTips = tips.filter((tip) => tip.category === category);

  // If excluding a tip and there are multiple tips, filter it out
  if (excludeId && categoryTips.length > 1) {
    categoryTips = categoryTips.filter((tip) => tip.id !== excludeId);
  }

  const randomIndex = Math.floor(Math.random() * categoryTips.length);
  return categoryTips[randomIndex];
}

/**
 * Get tips for a specific category (used by client component)
 */
export function getTipsForState(state: UserState): Tip[] {
  const category = getTipCategory(state);
  return tips.filter((tip) => tip.category === category);
}

/**
 * Get all tips (used for random selection across all categories)
 */
export function getAllTipsArray(): Tip[] {
  return [...tips];
}

/**
 * Get all tips (for testing/debugging)
 */
export function getAllTips(): Tip[] {
  return tips;
}
