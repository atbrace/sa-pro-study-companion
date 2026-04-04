import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  logContentIssue,
  getContentIssues,
  clearContentIssues,
  type ContentIssue,
} from '../logger';

beforeEach(() => {
  clearContentIssues();
});

describe('logContentIssue', () => {
  it('collects issues in order', () => {
    logContentIssue({
      level: 'warn',
      reason: 'missing',
      message: 'No meta.yaml found',
      filePath: '/content/domain-1/meta.yaml',
    });
    logContentIssue({
      level: 'error',
      reason: 'malformed',
      message: 'Invalid YAML syntax',
      filePath: '/content/domain-1/topics/t1/questions.yaml',
      context: { domainId: 'domain-1', topicId: 't1' },
    });

    const issues = getContentIssues();
    expect(issues).toHaveLength(2);
    expect(issues[0].reason).toBe('missing');
    expect(issues[1].reason).toBe('malformed');
    expect(issues[1].context?.topicId).toBe('t1');
  });

  it('prints to stderr in dev mode', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logContentIssue({
      level: 'warn',
      reason: 'missing',
      message: 'File not found',
      filePath: '/content/test.yaml',
    });
    logContentIssue({
      level: 'error',
      reason: 'malformed',
      message: 'Bad YAML',
      filePath: '/content/bad.yaml',
    });

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain('content:warn');
    expect(warnSpy.mock.calls[0][0]).toContain('missing');

    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0][0]).toContain('content:error');
    expect(errorSpy.mock.calls[0][0]).toContain('malformed');

    warnSpy.mockRestore();
    errorSpy.mockRestore();
    process.env.NODE_ENV = origEnv;
  });

  it('does not print in production mode', () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logContentIssue({
      level: 'warn',
      reason: 'missing',
      message: 'File not found',
      filePath: '/content/test.yaml',
    });

    expect(warnSpy).not.toHaveBeenCalled();
    // But issue is still collected
    expect(getContentIssues()).toHaveLength(1);

    warnSpy.mockRestore();
    process.env.NODE_ENV = origEnv;
  });
});

describe('clearContentIssues', () => {
  it('removes all collected issues', () => {
    logContentIssue({
      level: 'warn',
      reason: 'missing',
      message: 'Test',
      filePath: '/test',
    });
    expect(getContentIssues()).toHaveLength(1);

    clearContentIssues();
    expect(getContentIssues()).toHaveLength(0);
  });
});

describe('getContentIssues', () => {
  it('returns readonly array', () => {
    const issues = getContentIssues();
    expect(Array.isArray(issues)).toBe(true);
    expect(issues).toHaveLength(0);
  });
});
