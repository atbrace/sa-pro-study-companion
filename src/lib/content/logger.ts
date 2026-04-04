/**
 * Structured content logger.
 *
 * Collects content loading issues (missing files, malformed YAML) so they can
 * be surfaced by the loader at runtime and by `pnpm content:validate` in CI.
 * In dev mode, issues are also printed to stderr for immediate visibility.
 */

export type ContentIssueLevel = 'warn' | 'error';
export type ContentIssueReason = 'missing' | 'malformed';

export interface ContentIssue {
  level: ContentIssueLevel;
  reason: ContentIssueReason;
  message: string;
  filePath: string;
  context?: Record<string, string>;
}

const issues: ContentIssue[] = [];

/** Log a content loading issue. Collects it and optionally prints in dev mode. */
export function logContentIssue(issue: ContentIssue): void {
  issues.push(issue);

  if (process.env.NODE_ENV === 'development') {
    const ctx = issue.context
      ? ` ${JSON.stringify(issue.context)}`
      : '';
    const line = `[content:${issue.level}] ${issue.reason}: ${issue.message} (${issue.filePath})${ctx}`;
    if (issue.level === 'error') {
      console.error(line);
    } else {
      console.warn(line);
    }
  }
}

/** Get all collected content issues. */
export function getContentIssues(): readonly ContentIssue[] {
  return issues;
}

/** Clear all collected issues. Exported for testing. */
export function clearContentIssues(): void {
  issues.length = 0;
}
