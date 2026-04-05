import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExamProvider, useExam } from '../ExamContext';
import type { ExamConfig } from '@/types/exam';

const testConfig: ExamConfig = {
  id: 'sap-c02',
  name: 'AWS Solutions Architect Professional',
  shortName: 'SAP-C02',
  passingScore: 750,
  totalScore: 1000,
  masteryThreshold: 85,
  weakAreaThreshold: 60,
  resolveThreshold: 80,
  description: 'Test exam',
  icon: 'Award',
  color: 'blue',
  tutorPrompt: 'You are a tutor',
  domains: [{ id: 'domain-1', name: 'Domain 1', weight: 100 }],
};

describe('ExamContext', () => {
  it('provides examId and config to children', () => {
    function TestConsumer() {
      const { examId, config } = useExam();
      return <div data-testid="result">{examId}-{config.shortName}</div>;
    }

    render(
      <ExamProvider examId="sap-c02" config={testConfig}>
        <TestConsumer />
      </ExamProvider>
    );

    expect(screen.getByTestId('result')).toHaveTextContent('sap-c02-SAP-C02');
  });

  it('useExam throws when used outside ExamProvider', () => {
    function BadConsumer() {
      useExam();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useExam must be used within ExamProvider'
    );
  });

  it('provides full config object with all fields', () => {
    function ConfigConsumer() {
      const { config } = useExam();
      return (
        <div>
          <span data-testid="passing">{config.passingScore}</span>
          <span data-testid="mastery">{config.masteryThreshold}</span>
          <span data-testid="domains">{config.domains.length}</span>
        </div>
      );
    }

    render(
      <ExamProvider examId="sap-c02" config={testConfig}>
        <ConfigConsumer />
      </ExamProvider>
    );

    expect(screen.getByTestId('passing')).toHaveTextContent('750');
    expect(screen.getByTestId('mastery')).toHaveTextContent('85');
    expect(screen.getByTestId('domains')).toHaveTextContent('1');
  });
});
