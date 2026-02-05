import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDomain, createTopic, createDomainMeta, createTopicMeta } from '@/lib/test-helpers/factories';

// Must reset modules between groups to clear cachedIndices Map
let serializeIndexForPrompt: typeof import('../index').serializeIndexForPrompt;
let mockGetAllDomains: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();

  mockGetAllDomains = vi.fn().mockReturnValue([]);

  vi.doMock('../loader', () => ({
    getAllDomains: mockGetAllDomains,
  }));

  const mod = await import('../index');
  serializeIndexForPrompt = mod.serializeIndexForPrompt;
});

describe('serializeIndexForPrompt', () => {
  it('returns markdown with domain headers and service routes', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', shortName: 'Complexity' }),
        topics: [
          createTopic({
            meta: createTopicMeta({
              id: 'vpc-topic',
              name: 'VPC Networking',
              keyServices: ['Amazon VPC', 'AWS Transit Gateway'],
            }),
          }),
        ],
      }),
    ]);

    const result = serializeIndexForPrompt('sap-c02');
    expect(result).toContain('## App Navigation Reference');
    expect(result).toContain('**Complexity:**');
    expect(result).toContain('Amazon VPC');
    expect(result).toContain('AWS Transit Gateway');
    expect(result).toContain('/sap-c02/study/domain-1/vpc-topic');
  });

  it('deduplicates services within same domain', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', shortName: 'Test' }),
        topics: [
          createTopic({
            meta: createTopicMeta({ id: 'topic-1', name: 'T1', keyServices: ['Amazon S3'] }),
          }),
          createTopic({
            meta: createTopicMeta({ id: 'topic-2', name: 'T2', keyServices: ['Amazon S3'] }),
          }),
        ],
      }),
    ]);

    const result = serializeIndexForPrompt('sap-c02');
    // S3 appears twice because it links to different routes (different topics)
    // The dedup is on (service + route) pair, not just service name
    const s3Matches = result.match(/Amazon S3/g);
    expect(s3Matches).toHaveLength(2);
  });

  it('handles topics with no keyServices', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', shortName: 'Test' }),
        topics: [
          createTopic({
            meta: createTopicMeta({ id: 'topic-1', name: 'T1', keyServices: [] }),
          }),
        ],
      }),
    ]);

    const result = serializeIndexForPrompt('sap-c02');
    // No services section for this domain
    expect(result).toContain('## App Navigation Reference');
    expect(result).not.toContain('**Test:**');
  });

  it('handles topics with no keyConcepts', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', shortName: 'Test' }),
        topics: [
          createTopic({
            meta: createTopicMeta({ id: 'topic-1', name: 'T1', keyServices: ['Amazon S3'], keyConcepts: [] }),
          }),
        ],
      }),
    ]);

    const result = serializeIndexForPrompt('sap-c02');
    expect(result).toContain('Amazon S3');
  });

  it('handles empty domains array', () => {
    mockGetAllDomains.mockReturnValue([]);

    const result = serializeIndexForPrompt('sap-c02');
    expect(result).toContain('## App Navigation Reference');
    // No domain headers
    expect(result).not.toContain('**');
  });

  it('groups services by domain shortName', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', shortName: 'Networking' }),
        topics: [
          createTopic({
            meta: createTopicMeta({ id: 'topic-1', name: 'T1', keyServices: ['Amazon VPC'] }),
          }),
        ],
      }),
      createDomain({
        meta: createDomainMeta({ id: 'domain-2', shortName: 'Storage' }),
        topics: [
          createTopic({
            meta: createTopicMeta({ id: 'topic-2', name: 'T2', keyServices: ['Amazon S3'] }),
          }),
        ],
      }),
    ]);

    const result = serializeIndexForPrompt('sap-c02');
    expect(result).toContain('**Networking:**');
    expect(result).toContain('**Storage:**');
  });
});

describe('buildContentIndex caching', () => {
  it('caches index per examId (getAllDomains called once for same exam)', () => {
    mockGetAllDomains.mockReturnValue([]);

    serializeIndexForPrompt('sap-c02');
    serializeIndexForPrompt('sap-c02');

    expect(mockGetAllDomains).toHaveBeenCalledTimes(1);
  });

  it('separate examIds get separate indices', () => {
    mockGetAllDomains.mockReturnValue([]);

    serializeIndexForPrompt('sap-c02');
    serializeIndexForPrompt('mla-c01');

    expect(mockGetAllDomains).toHaveBeenCalledTimes(2);
    expect(mockGetAllDomains).toHaveBeenCalledWith('sap-c02');
    expect(mockGetAllDomains).toHaveBeenCalledWith('mla-c01');
  });

  it('indexes topics by topic ID', () => {
    mockGetAllDomains.mockReturnValue([
      createDomain({
        meta: createDomainMeta({ id: 'domain-1', shortName: 'Test' }),
        topics: [
          createTopic({
            meta: createTopicMeta({ id: 'my-topic', name: 'My Topic', keyServices: ['Amazon EC2'] }),
          }),
        ],
      }),
    ]);

    const result = serializeIndexForPrompt('test-exam');
    // The serialized prompt includes routes with topic IDs
    expect(result).toContain('/test-exam/study/domain-1/my-topic');
  });
});
