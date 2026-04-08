import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorProvider, useTutorContext } from '../TutorContext';

describe('TutorContext', () => {
  it('provides openTutor, closeTutor, and isOpen to children', () => {
    const mockValue = {
      openTutor: vi.fn(),
      closeTutor: vi.fn(),
      isOpen: false,
    };

    function TestConsumer() {
      const { isOpen } = useTutorContext();
      return <div data-testid="open">{String(isOpen)}</div>;
    }

    render(
      <TutorProvider value={mockValue}>
        <TestConsumer />
      </TutorProvider>
    );

    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });

  it('useTutorContext throws when used outside TutorProvider', () => {
    function BadConsumer() {
      useTutorContext();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      'useTutorContext must be used within TutorProvider'
    );
  });

  it('children can call openTutor and closeTutor', () => {
    const mockValue = {
      openTutor: vi.fn(),
      closeTutor: vi.fn(),
      isOpen: false,
    };

    function TestConsumer() {
      const { openTutor, closeTutor } = useTutorContext();
      return (
        <div>
          <button onClick={() => openTutor()}>Open</button>
          <button onClick={() => closeTutor()}>Close</button>
        </div>
      );
    }

    render(
      <TutorProvider value={mockValue}>
        <TestConsumer />
      </TutorProvider>
    );

    fireEvent.click(screen.getByText('Open'));
    expect(mockValue.openTutor).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Close'));
    expect(mockValue.closeTutor).toHaveBeenCalledTimes(1);
  });

  it('reflects isOpen=true from provider', () => {
    const mockValue = {
      openTutor: vi.fn(),
      closeTutor: vi.fn(),
      isOpen: true,
    };

    function TestConsumer() {
      const { isOpen } = useTutorContext();
      return <div data-testid="open">{String(isOpen)}</div>;
    }

    render(
      <TutorProvider value={mockValue}>
        <TestConsumer />
      </TutorProvider>
    );

    expect(screen.getByTestId('open')).toHaveTextContent('true');
  });
});
