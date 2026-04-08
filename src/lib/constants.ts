/** Score at or above which a topic is considered "mastered" / "exam ready" */
export const MASTERY_THRESHOLD = 85;

/** Score at or above which a topic is considered "developing" */
export const APPROACHING_THRESHOLD = 60;

/** Score at or above which readiness level is "approaching" (vs "building") */
export const READINESS_APPROACHING_THRESHOLD = 65;

/** Score at or above which dashboard tips switch to exam-prep category */
export const EXAM_PREP_THRESHOLD = 75;

/** Decimal equivalent for SQL queries (mastery_level is 0-1 scale) */
export const MASTERY_THRESHOLD_DECIMAL = MASTERY_THRESHOLD / 100;
