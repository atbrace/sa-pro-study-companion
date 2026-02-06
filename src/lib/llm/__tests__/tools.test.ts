import { describe, it, expect } from 'vitest';
import { TUTOR_TOOLS } from '../tools';

describe('TUTOR_TOOLS', () => {
  it('exports array of tools', () => {
    expect(Array.isArray(TUTOR_TOOLS)).toBe(true);
    expect(TUTOR_TOOLS.length).toBeGreaterThan(0);
  });

  it('has all 7 tutor tools', () => {
    expect(TUTOR_TOOLS).toHaveLength(7);
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

  it('has get_question_details tool with correct params', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'get_question_details');
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('question');
    expect(tool?.parameters).toMatchObject({
      type: 'object',
      properties: {
        questionId: { type: 'string' },
        domainId: { type: 'string' },
        topicId: { type: 'string' },
      },
      required: ['questionId'],
    });
  });

  it('has search_study_content tool with correct params', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'search_study_content');
    expect(tool).toBeDefined();
    expect(tool?.parameters).toMatchObject({
      type: 'object',
      properties: {
        query: { type: 'string' },
      },
      required: ['query'],
    });
  });

  it('has get_topic_metadata tool with correct params', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'get_topic_metadata');
    expect(tool).toBeDefined();
    expect(tool?.parameters).toMatchObject({
      type: 'object',
      properties: {
        domainId: { type: 'string' },
        topicId: { type: 'string' },
      },
      required: ['domainId', 'topicId'],
    });
  });

  it('has get_assessment_history tool with correct params', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'get_assessment_history');
    expect(tool).toBeDefined();
    expect(tool?.parameters).toMatchObject({
      type: 'object',
      properties: {
        domainId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: [],
    });
  });

  it('has get_weak_area_questions tool with correct params', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'get_weak_area_questions');
    expect(tool).toBeDefined();
    expect(tool?.parameters).toMatchObject({
      type: 'object',
      properties: {
        domainId: { type: 'string' },
        topicId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: [],
    });
  });

  it('has suggest_next_study_topic tool with no params', () => {
    const tool = TUTOR_TOOLS.find(t => t.name === 'suggest_next_study_topic');
    expect(tool).toBeDefined();
    expect(tool?.parameters).toMatchObject({
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
