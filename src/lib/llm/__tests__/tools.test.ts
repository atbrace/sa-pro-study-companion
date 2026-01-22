import { describe, it, expect } from 'vitest';
import { TUTOR_TOOLS } from '../tools';

describe('TUTOR_TOOLS', () => {
  it('exports array of tools', () => {
    expect(Array.isArray(TUTOR_TOOLS)).toBe(true);
    expect(TUTOR_TOOLS.length).toBeGreaterThan(0);
  });

  it('has get_study_progress tool', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'get_study_progress');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('progress');
    expect(tool?.parameters).toEqual({
      type: 'object',
      properties: {},
      required: [],
    });
  });

  it('all tools have required properties', () => {
    for (const tool of TUTOR_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(typeof tool.name).toBe('string');
      expect(tool.description).toBeTruthy();
      expect(typeof tool.description).toBe('string');
      expect(tool.parameters).toBeDefined();
      expect(typeof tool.parameters).toBe('object');
    }
  });

  it('tool names are valid identifiers', () => {
    for (const tool of TUTOR_TOOLS) {
      // Tool names should be snake_case identifiers
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
    }
  });
});
