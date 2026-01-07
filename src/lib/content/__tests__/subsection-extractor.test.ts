import { describe, it, expect } from 'vitest';
import { extractSubsectionContent } from '../subsection-extractor';

describe('extractSubsectionContent', () => {
  describe('H2 extraction', () => {
    it('extracts H2 section to next H2', () => {
      const content = `## Section 1
Content for section 1
More content

## Section 2
Content for section 2`;

      const result = extractSubsectionContent(content, 'Section 1', 2);

      expect(result).toContain('## Section 1');
      expect(result).toContain('Content for section 1');
      expect(result).toContain('More content');
      expect(result).not.toContain('## Section 2');
      expect(result).not.toContain('Content for section 2');
    });

    it('extracts H2 section to end if no next H2', () => {
      const content = `## Only Section
This is the only section
With multiple lines
And more content`;

      const result = extractSubsectionContent(content, 'Only Section', 2);

      expect(result).toContain('## Only Section');
      expect(result).toContain('This is the only section');
      expect(result).toContain('With multiple lines');
      expect(result).toContain('And more content');
    });
  });

  describe('H3 extraction', () => {
    it('extracts H3 subsection to next H3', () => {
      const content = `## Main Section
### Subsection 1
Content for subsection 1

### Subsection 2
Content for subsection 2`;

      const result = extractSubsectionContent(content, 'Subsection 1', 3);

      expect(result).toContain('### Subsection 1');
      expect(result).toContain('Content for subsection 1');
      expect(result).not.toContain('### Subsection 2');
      expect(result).not.toContain('Content for subsection 2');
    });

    it('extracts H3 subsection to next H2 (boundary)', () => {
      const content = `## Section 1
### Subsection
Content for subsection

## Section 2
More content`;

      const result = extractSubsectionContent(content, 'Subsection', 3);

      expect(result).toContain('### Subsection');
      expect(result).toContain('Content for subsection');
      expect(result).not.toContain('## Section 2');
      expect(result).not.toContain('More content');
    });

    it('extracts H3 subsection to end if no next heading', () => {
      const content = `## Main Section
### Only Subsection
This is the only subsection
With multiple lines`;

      const result = extractSubsectionContent(content, 'Only Subsection', 3);

      expect(result).toContain('### Only Subsection');
      expect(result).toContain('This is the only subsection');
      expect(result).toContain('With multiple lines');
    });
  });

  describe('H4 extraction', () => {
    it('extracts H4 subsection to next H4', () => {
      const content = `### Main Subsection
#### Sub-subsection 1
Content for sub-subsection 1

#### Sub-subsection 2
Content for sub-subsection 2`;

      const result = extractSubsectionContent(content, 'Sub-subsection 1', 4);

      expect(result).toContain('#### Sub-subsection 1');
      expect(result).toContain('Content for sub-subsection 1');
      expect(result).not.toContain('#### Sub-subsection 2');
      expect(result).not.toContain('Content for sub-subsection 2');
    });

    it('extracts H4 subsection to next H3 (boundary)', () => {
      const content = `### Subsection 1
#### Sub-subsection
Content for sub-subsection

### Subsection 2
More content`;

      const result = extractSubsectionContent(content, 'Sub-subsection', 4);

      expect(result).toContain('#### Sub-subsection');
      expect(result).toContain('Content for sub-subsection');
      expect(result).not.toContain('### Subsection 2');
      expect(result).not.toContain('More content');
    });

    it('extracts H4 subsection to next H2 (higher boundary)', () => {
      const content = `### Subsection
#### Sub-subsection
Content for sub-subsection

## Next Section
More content`;

      const result = extractSubsectionContent(content, 'Sub-subsection', 4);

      expect(result).toContain('#### Sub-subsection');
      expect(result).toContain('Content for sub-subsection');
      expect(result).not.toContain('## Next Section');
      expect(result).not.toContain('More content');
    });
  });

  describe('Content truncation', () => {
    it('truncates content longer than 5000 chars', () => {
      const longContent = `## Test Section
${'x'.repeat(6000)}`;

      const result = extractSubsectionContent(longContent, 'Test Section', 2);

      expect(result.length).toBeLessThanOrEqual(5050); // 5000 + truncation message
      expect(result).toContain('[Content truncated...]');
    });

    it('does not truncate content under 5000 chars', () => {
      const shortContent = `## Test Section
${'x'.repeat(100)}`;

      const result = extractSubsectionContent(shortContent, 'Test Section', 2);

      expect(result).not.toContain('[Content truncated...]');
      expect(result.length).toBeLessThan(5000);
    });
  });

  describe('Special characters', () => {
    it('handles headings with special characters', () => {
      const content = `## AWS Organizations & SCPs
Content about AWS Organizations

## Next Section
More content`;

      const result = extractSubsectionContent(content, 'AWS Organizations & SCPs', 2);

      expect(result).toContain('## AWS Organizations & SCPs');
      expect(result).toContain('Content about AWS Organizations');
      expect(result).not.toContain('## Next Section');
    });

    it('handles headings with parentheses', () => {
      const content = `### Lambda (Serverless Compute)
Content about Lambda

### EC2 (Virtual Servers)
More content`;

      const result = extractSubsectionContent(content, 'Lambda (Serverless Compute)', 3);

      expect(result).toContain('### Lambda (Serverless Compute)');
      expect(result).toContain('Content about Lambda');
      expect(result).not.toContain('### EC2 (Virtual Servers)');
    });

    it('handles headings with dollar signs and asterisks', () => {
      const content = `#### Cost: $0.20 per GB * month
Pricing details

#### Next Item
More content`;

      const result = extractSubsectionContent(content, 'Cost: $0.20 per GB * month', 4);

      expect(result).toContain('#### Cost: $0.20 per GB * month');
      expect(result).toContain('Pricing details');
      expect(result).not.toContain('#### Next Item');
    });
  });

  describe('Edge cases', () => {
    it('returns empty string when heading not found', () => {
      const content = `## Existing Section
Content here`;

      const result = extractSubsectionContent(content, 'Nonexistent Section', 2);

      expect(result).toBe('');
    });

    it('handles duplicate heading text (matches first occurrence)', () => {
      const content = `## Best Practices
First occurrence content

## Best Practices
Second occurrence content`;

      const result = extractSubsectionContent(content, 'Best Practices', 2);

      expect(result).toContain('First occurrence content');
      expect(result).not.toContain('Second occurrence content');
    });

    it('handles content with only one heading', () => {
      const content = `## Only Heading
Some content
More content
Even more content`;

      const result = extractSubsectionContent(content, 'Only Heading', 2);

      expect(result).toContain('## Only Heading');
      expect(result).toContain('Some content');
      expect(result).toContain('More content');
      expect(result).toContain('Even more content');
    });

    it('handles empty content after heading', () => {
      const content = `## Empty Section

## Next Section
Content`;

      const result = extractSubsectionContent(content, 'Empty Section', 2);

      expect(result).toContain('## Empty Section');
      expect(result).not.toContain('## Next Section');
    });
  });

  describe('Complex content', () => {
    it('extracts content with code blocks, lists, and formatting', () => {
      const content = `### IAM Policies
IAM policies are JSON documents that define permissions.

**Example policy:**
\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": []
}
\`\`\`

Key points:
- Always use least privilege
- Test policies thoroughly
- Use policy simulator

### Next Topic
More content`;

      const result = extractSubsectionContent(content, 'IAM Policies', 3);

      expect(result).toContain('### IAM Policies');
      expect(result).toContain('IAM policies are JSON documents');
      expect(result).toContain('**Example policy:**');
      expect(result).toContain('```json');
      expect(result).toContain('Key points:');
      expect(result).toContain('- Always use least privilege');
      expect(result).not.toContain('### Next Topic');
    });
  });
});
