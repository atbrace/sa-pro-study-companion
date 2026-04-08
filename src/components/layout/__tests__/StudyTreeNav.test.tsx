import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StudyTreeNav } from '../StudyTreeNav';
import type { SidebarHierarchy } from '@/types/sidebar';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/sap-c02/study/domain-1/topic-1/overview'),
}));

// Mock next/link as a plain anchor
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock useSidebarState with controllable state
const mockToggleStudy = vi.fn();
const mockToggleDomain = vi.fn();
const mockToggleTopic = vi.fn();

vi.mock('@/hooks/useSidebarState', () => ({
  useSidebarState: vi.fn(() => ({
    isStudyExpanded: true,
    expandedDomains: new Set(['domain-1']),
    expandedTopics: new Set(['domain-1/topic-1']),
    toggleStudy: mockToggleStudy,
    toggleDomain: mockToggleDomain,
    toggleTopic: mockToggleTopic,
  })),
}));

// Mock color utils
vi.mock('@/lib/utils/colors', () => ({
  getDomainColorHex: vi.fn(() => '#3b82f6'),
  getMasteryDotColorClass: vi.fn(() => 'bg-green-500'),
}));

const hierarchy: SidebarHierarchy = {
  domains: [
    {
      id: 'domain-1',
      name: 'Organizational Complexity',
      shortName: 'Complexity',
      icon: '🏗️',
      color: 'blue',
      topics: [
        {
          id: 'topic-1',
          name: 'Network Connectivity',
          shortName: 'Networking',
          difficulty: 'intermediate',
          sections: [
            { id: 'overview', title: 'Overview', order: 1 },
            { id: 'best-practices', title: 'Best Practices', order: 2 },
          ],
        },
        {
          id: 'topic-2',
          name: 'Security Controls',
          shortName: 'Security',
          difficulty: 'advanced',
          sections: [],
        },
      ],
    },
    {
      id: 'domain-2',
      name: 'New Solutions',
      shortName: 'Solutions',
      icon: '🔧',
      color: 'green',
      topics: [],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StudyTreeNav', () => {
  it('renders the Study root trigger', () => {
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);
    expect(screen.getByText('Study')).toBeInTheDocument();
  });

  it('renders all domains from hierarchy', () => {
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);
    expect(screen.getByText('Complexity')).toBeInTheDocument();
    expect(screen.getByText('Solutions')).toBeInTheDocument();
  });

  it('renders topics within expanded domains', () => {
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);
    expect(screen.getByText('Networking')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
  });

  it('renders section links within expanded topics', () => {
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Best Practices')).toBeInTheDocument();
  });

  it('section links have correct href format', () => {
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);
    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink).toHaveAttribute(
      'href',
      '/sap-c02/study/domain-1/topic-1/overview'
    );
  });

  it('calls onNavigate when a section link is clicked', () => {
    const onNavigate = vi.fn();
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Overview'));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('renders accessible aria-labels on collapsible triggers', () => {
    render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);

    expect(screen.getByLabelText('Collapse study content')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse Complexity')).toBeInTheDocument();
    expect(screen.getByLabelText('Collapse Networking')).toBeInTheDocument();
  });

  it('renders domain with left border color from getDomainColorHex', () => {
    const { container } = render(<StudyTreeNav hierarchy={hierarchy} examId="sap-c02" />);
    // jsdom renders React style={{ borderLeftColor: '#3b82f6' }} as rgb()
    const borderedDivs = container.querySelectorAll('.border-l-2');
    expect(borderedDivs.length).toBeGreaterThanOrEqual(1);
    const style = (borderedDivs[0] as HTMLElement).style;
    expect(style.borderLeftColor).toBeTruthy();
  });
});
