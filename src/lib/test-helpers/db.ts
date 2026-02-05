import { vi } from 'vitest';

export function createMockStatement() {
  return {
    run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
    get: vi.fn().mockReturnValue(null),
    all: vi.fn().mockReturnValue([]),
  };
}

export function createMockDb() {
  const stmt = createMockStatement();
  const mockDb = {
    prepare: vi.fn().mockReturnValue(stmt),
    transaction: vi.fn().mockImplementation((fn: Function) => (...args: unknown[]) => fn(...args)),
    exec: vi.fn(),
    _stmt: stmt, // expose for test assertions
  };
  return mockDb;
}
